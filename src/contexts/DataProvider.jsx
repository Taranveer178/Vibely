import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addMessageReaction,
  castPollVote,
  createChatMessage,
  createCircle as createFirestoreCircle,
  createMoment as createFirestoreMoment,
  createStory as createFirestoreStory,
  fetchChatMessages,
  fetchChats,
  fetchCircles,
  fetchDiscoverProfiles,
  fetchMoments,
  fetchStories,
  markStoryViewed as markFirestoreStoryViewed,
  updateUserProfiles,
} from '../services/firebaseData';
import { useAuth } from './useAuth';
import { DataContext } from './DataContext';

function readSavedMessages(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(`vibely_saved_messages_${userId}`) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function DataProvider({ children }) {
  const { user, setUser } = useAuth();
  const userId = user?.id;
  const [chats, setChats] = useState([]);
  const [stories, setStories] = useState([]);
  const [circles, setCircles] = useState([]);
  const [moments, setMoments] = useState([]);
  const [users, setUsers] = useState([]);
  const [savedMessages, setSavedMessages] = useState(() => readSavedMessages(user?.id));
  const [savedMessagesOwner, setSavedMessagesOwner] = useState(userId);
  const [activeCall, setActiveCall] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const toastTimeout = useRef(null);
  const activeUserId = useRef(userId);

  useEffect(() => {
    activeUserId.current = userId;
  }, [userId]);

  const load = useCallback(async (key, loader, setter) => {
    if (!userId) return;
    const requestedUserId = userId;
    setLoading((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [key]: '' }));
    try {
      const result = await loader(userId);
      if (activeUserId.current !== requestedUserId) return;
      setter(result);
    } catch (error) {
      if (activeUserId.current !== requestedUserId) return;
      setErrors((current) => ({ ...current, [key]: error.message }));
    } finally {
      if (activeUserId.current === requestedUserId) {
        setLoading((current) => ({ ...current, [key]: false }));
      }
    }
  }, [userId]);

  const refreshChats = useCallback(() => load('chats', fetchChats, setChats), [load]);
  const refreshStories = useCallback(() => load('stories', fetchStories, setStories), [load]);
  const refreshCircles = useCallback(() => load('circles', fetchCircles, setCircles), [load]);
  const refreshMoments = useCallback(() => load('moments', fetchMoments, setMoments), [load]);
  const refreshUsers = useCallback(() => load('users', fetchDiscoverProfiles, setUsers), [load]);
  const refreshChatMessages = useCallback(async (chatId) => {
    if (!userId) return [];
    const requestedUserId = userId;
    const key = `messages:${chatId}`;
    setLoading((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [`chat:${chatId}`]: '' }));
    try {
      const messages = await fetchChatMessages(chatId);
      if (activeUserId.current !== requestedUserId) return [];
      setChats((current) => current.map((chat) => (
        chat.id === chatId ? { ...chat, messages } : chat
      )));
      return messages;
    } catch (error) {
      if (activeUserId.current !== requestedUserId) return [];
      setErrors((current) => ({ ...current, [`chat:${chatId}`]: error.message }));
      throw error;
    } finally {
      if (activeUserId.current === requestedUserId) {
        setLoading((current) => ({ ...current, [key]: false }));
      }
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setChats([]);
      setStories([]);
      setCircles([]);
      setMoments([]);
      setUsers([]);
      setErrors({});
      setLoading({});
      return undefined;
    }
    refreshChats();
    refreshStories();
    refreshCircles();
    refreshMoments();
    refreshUsers();
    return undefined;
  }, [userId, refreshChats, refreshStories, refreshCircles, refreshMoments, refreshUsers]);

  useEffect(() => {
    setSavedMessages(readSavedMessages(userId));
    setSavedMessagesOwner(userId);
  }, [userId]);

  const chatIdsKey = chats.map((chat) => chat.id).join('|');
  useEffect(() => {
    if (!userId || !chatIdsKey) return undefined;

    const pollMessages = async () => {
      const chatIds = chatIdsKey.split('|');
      await Promise.all(chatIds.map((chatId) => refreshChatMessages(chatId).catch(() => {})));
    };

    pollMessages();
    const interval = window.setInterval(pollMessages, 5000);
    return () => window.clearInterval(interval);
  }, [userId, chatIdsKey, refreshChatMessages]);

  useEffect(() => {
    if (userId && savedMessagesOwner === userId) {
      localStorage.setItem(`vibely_saved_messages_${userId}`, JSON.stringify(savedMessages));
    }
  }, [userId, savedMessages, savedMessagesOwner]);

  useEffect(() => () => window.clearTimeout(toastTimeout.current), []);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const sendMessage = useCallback(async (chatId, text, type = 'text', extra = {}) => {
    if (!user) throw new Error('You must be signed in to send messages.');
    const savedMessage = await createChatMessage(chatId, user, text, type, extra);
    setChats((current) => current.map((chat) => (
      chat.id === chatId
        ? { ...chat, messages: [...(chat.messages || []), savedMessage] }
        : chat
    )));
    return savedMessage;
  }, [user]);

  const addReaction = useCallback(async (chatId, messageId, emoji) => {
    await addMessageReaction(chatId, messageId, emoji);
    setChats((current) => current.map((chat) => chat.id === chatId ? {
      ...chat,
      messages: (chat.messages || []).map((message) => message.id === messageId
        ? { ...message, reactions: [...(message.reactions || []), emoji] }
        : message),
    } : chat));
  }, []);

  const toggleSaveMessage = useCallback((message) => {
    const alreadySaved = savedMessages.some((item) => item.id === message.id);
    setSavedMessages((current) => (
      alreadySaved ? current.filter((item) => item.id !== message.id) : [...current, message]
    ));
    showToast(alreadySaved ? 'Removed from Saved Messages' : 'Saved to Starred Messages! ⭐');
  }, [savedMessages, showToast]);

  const votePoll = useCallback(async (chatId, messageId, optionId) => {
    await castPollVote(chatId, messageId, optionId);
    setChats((current) => current.map((chat) => chat.id === chatId ? {
      ...chat,
      messages: (chat.messages || []).map((message) => {
        if (message.id !== messageId || message.type !== 'poll') return message;
        const options = message.options.map((option) => option.id === optionId
          ? { ...option, votes: option.votes + 1 }
          : option);
        return { ...message, options, totalVotes: message.totalVotes + 1 };
      }),
    } : chat));
    showToast('Vote recorded!');
  }, [showToast]);

  const createCircle = useCallback(async (circle) => {
    if (!userId) throw new Error('You must be signed in to create a circle.');
    const created = await createFirestoreCircle(userId, { ...circle, color: 'bg-violet-600' });
    setCircles((current) => [...current, created]);
    showToast('New Circle created!');
  }, [userId, showToast]);

  const createStory = useCallback(async (story) => {
    if (!user) throw new Error('You must be signed in to create a story.');
    const created = await createFirestoreStory(user, story);
    setStories((current) => [created, ...current]);
    return created;
  }, [user]);

  const markStoryViewed = useCallback(async (storyId) => {
    if (!userId) throw new Error('You must be signed in to view stories.');
    await markFirestoreStoryViewed(storyId, userId);
    setStories((current) => current.map((story) => (
      story.id === storyId ? { ...story, isViewed: true } : story
    )));
  }, [userId]);

  const createMoment = useCallback(async (moment) => {
    if (!user) throw new Error('You must be signed in to share a moment.');
    const created = await createFirestoreMoment(user, moment);
    setMoments((current) => [created, ...current]);
    return created;
  }, [user]);

  const updateProfile = useCallback(async (profile) => {
    if (!user?.id) throw new Error('You must be signed in to update your profile.');
    const nextUser = await updateUserProfiles(user, profile);
    setUser(nextUser);
    return nextUser;
  }, [user, setUser]);

  const value = useMemo(() => ({
    chats, stories, circles, moments, users, savedMessages, activeCall, toastMessage,
    loading, errors, sendMessage, addReaction, toggleSaveMessage, votePoll,
    createCircle, createStory, markStoryViewed, createMoment, updateProfile,
    setActiveCall, showToast, refreshChats, refreshStories, refreshCircles,
    refreshMoments, refreshUsers,
    refreshChatMessages,
  }), [
    chats, stories, circles, moments, users, savedMessages, activeCall, toastMessage,
    loading, errors, sendMessage, addReaction, toggleSaveMessage, votePoll,
    createCircle, createStory, markStoryViewed, createMoment, updateProfile,
    showToast, refreshChats, refreshStories, refreshCircles, refreshMoments, refreshUsers,
    refreshChatMessages,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
