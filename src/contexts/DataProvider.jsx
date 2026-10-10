import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { api } from '../services/api';
import { db } from '../../firebase';
import { useAuth } from './useAuth';
import { DataContext } from './DataContext';

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ['items', 'results', 'chats', 'messages', 'stories', 'circles', 'moments', 'users']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

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
  const [activeCall, setActiveCall] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const toastTimeout = useRef(null);

  const load = useCallback(async (key, path, setter) => {
    setLoading((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [key]: '' }));
    try {
      const payload = await api.get(path);
      setter(asList(payload));
    } catch (error) {
      setErrors((current) => ({ ...current, [key]: error.message }));
    } finally {
      setLoading((current) => ({ ...current, [key]: false }));
    }
  }, []);

  const refreshChats = useCallback(() => load('chats', '/api/chats', setChats), [load]);
  const refreshStories = useCallback(() => load('stories', '/api/stories', setStories), [load]);
  const refreshCircles = useCallback(() => load('circles', '/api/circles', setCircles), [load]);
  const refreshMoments = useCallback(() => load('moments', '/api/moments', setMoments), [load]);
  const refreshUsers = useCallback(() => load('users', '/api/users/discover', setUsers), [load]);
  const refreshChatMessages = useCallback(async (chatId) => {
    const key = `messages:${chatId}`;
    setLoading((current) => ({ ...current, [key]: true }));
    setErrors((current) => ({ ...current, [`chat:${chatId}`]: '' }));
    try {
      const payload = await api.get(`/api/chats/${encodeURIComponent(chatId)}/messages`);
      const messages = asList(payload);
      const liveState = Array.isArray(payload) ? {} : {
        ...(payload?.typingUsers !== undefined ? { typingUsers: payload.typingUsers } : {}),
      };
      setChats((current) => current.map((chat) => (
        chat.id === chatId ? { ...chat, ...liveState, messages } : chat
      )));
      return messages;
    } catch (error) {
      setErrors((current) => ({ ...current, [`chat:${chatId}`]: error.message }));
      throw error;
    } finally {
      setLoading((current) => ({ ...current, [key]: false }));
    }
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    refreshChats();
    refreshStories();
    refreshCircles();
    refreshMoments();
    refreshUsers();
    return undefined;
  }, [userId, refreshChats, refreshStories, refreshCircles, refreshMoments, refreshUsers]);

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
    if (userId) {
      localStorage.setItem(`vibely_saved_messages_${userId}`, JSON.stringify(savedMessages));
    }
  }, [userId, savedMessages]);

  useEffect(() => () => window.clearTimeout(toastTimeout.current), []);

  const showToast = useCallback((message) => {
    setToastMessage(message);
    window.clearTimeout(toastTimeout.current);
    toastTimeout.current = window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const sendMessage = useCallback(async (chatId, text, type = 'text', extra = {}) => {
    const message = await api.post(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
      text,
      type,
      ...extra,
    });
    const savedMessage = message?.message ?? message;
    if (!savedMessage?.id) throw new Error('The message response did not include a message ID.');
    setChats((current) => current.map((chat) => (
      chat.id === chatId
        ? { ...chat, messages: [...(chat.messages || []), savedMessage] }
        : chat
    )));
    return savedMessage;
  }, []);

  const addReaction = useCallback((chatId, messageId, emoji) => {
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

  const votePoll = useCallback((chatId, messageId, optionId) => {
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
    const result = await api.post('/api/circles', circle);
    const created = result?.circle ?? result;
    setCircles((current) => [...current, created]);
    showToast('New Circle created!');
  }, [showToast]);

  const createStory = useCallback(async (story) => {
    const result = await api.post('/api/stories', story);
    const created = result?.story ?? result;
    setStories((current) => [created, ...current]);
    return created;
  }, []);

  const markStoryViewed = useCallback(async (storyId) => {
    await api.post(`/api/stories/${encodeURIComponent(storyId)}/view`, {});
    setStories((current) => current.map((story) => (
      story.id === storyId ? { ...story, isViewed: true } : story
    )));
  }, []);

  const createMoment = useCallback(async (moment) => {
    const result = await api.post('/api/moments', moment);
    const created = result?.moment ?? result;
    setMoments((current) => [created, ...current]);
    return created;
  }, []);

  const updateProfile = useCallback(async (profile) => {
    if (!user?.id) throw new Error('You must be signed in to update your profile.');
    const nextUser = { ...user, ...profile };
    await setDoc(doc(db, 'users', user.id), nextUser, { merge: true });
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
