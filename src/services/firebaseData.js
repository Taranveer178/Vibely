import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../firebase';

function toDate(value) {
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function toDisplayTime(value) {
  return toDate(value)?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) || '';
}

function toDisplayDateTime(value) {
  return toDate(value)?.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) || '';
}

function fromDocument(snapshot) {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    timestamp: data.timestamp || toDisplayTime(data.createdAt),
  };
}

function publicProfile(user) {
  return {
    id: user.id,
    name: user.name || '',
    username: user.username || '',
    avatar: user.avatar || '',
    bio: user.bio || '',
    vibe: user.vibe || '',
    role: user.role || 'user',
  };
}

export async function saveNewUserProfile(user) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', user.id), { ...user, status: 'active' });
  batch.set(doc(db, 'profiles', user.id), publicProfile(user));
  await batch.commit();
}

export async function syncPublicProfile(user) {
  const profileRef = doc(db, 'profiles', user.id);
  const userRef = doc(db, 'users', user.id);
  const [profileSnapshot, userSnapshot] = await Promise.all([
    getDoc(profileRef),
    getDoc(userRef),
  ]);
  const profile = {
    id: user.id,
    name: user.name || '',
    username: user.username || '',
    avatar: user.avatar || '',
    bio: user.bio || '',
    vibe: user.vibe || '',
    lastSeenAt: serverTimestamp(),
  };
  if (!profileSnapshot.exists()) {
    profile.role = user.role || 'user';
  }
  const batch = writeBatch(db);
  batch.set(profileRef, profile, { merge: true });
  if (!userSnapshot.exists()) {
    batch.set(userRef, { ...user, status: 'active' });
  }
  await batch.commit();
}

export async function fetchChats(userId) {
  const snapshot = await getDocs(query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId),
  ));
  return snapshot.docs
    .map(fromDocument)
    .sort((a, b) => (toDate(b.updatedAt)?.getTime() || 0) - (toDate(a.updatedAt)?.getTime() || 0));
}

export async function fetchChatMessages(chatId) {
  const snapshot = await getDocs(query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
  ));
  return snapshot.docs.map(fromDocument);
}

export async function createChatMessage(chatId, user, text, type, extra) {
  const chatRef = doc(db, 'chats', chatId);
  const messageRef = doc(collection(chatRef, 'messages'));
  const createdAt = new Date();
  const message = {
    senderId: user.id,
    senderName: user.name || '',
    text,
    type,
    ...extra,
    status: 'sent',
    createdAt: Timestamp.fromDate(createdAt),
  };
  const batch = writeBatch(db);
  batch.set(messageRef, message);
  batch.update(chatRef, {
    updatedAt: Timestamp.fromDate(createdAt),
    lastMessage: type === 'voice' ? 'Voice note' : text,
  });
  await batch.commit();
  return fromDocument(await getDoc(messageRef));
}

export async function addMessageReaction(chatId, messageId, emoji) {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    reactions: arrayUnion(emoji),
  });
}

export async function castPollVote(chatId, messageId, optionId) {
  const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (!snapshot.exists()) throw new Error('This poll is no longer available.');
    const message = snapshot.data();
    if (message.type !== 'poll' || !Array.isArray(message.options)) {
      throw new Error('This message is not a poll.');
    }
    const option = message.options.find((item) => item.id === optionId);
    if (!option) throw new Error('That poll option is no longer available.');
    transaction.update(messageRef, {
      options: message.options.map((item) => item.id === optionId
        ? { ...item, votes: (item.votes || 0) + 1 }
        : item),
      totalVotes: (message.totalVotes || 0) + 1,
    });
  });
}

export async function fetchStories(userId) {
  const snapshot = await getDocs(query(collection(db, 'stories'), orderBy('createdAt', 'desc')));
  return snapshot.docs.map((storySnapshot) => {
    const story = fromDocument(storySnapshot);
    return {
      ...story,
      isViewed: (story.viewedBy || []).includes(userId),
      timestamp: toDisplayTime(story.createdAt) || story.timestamp,
    };
  });
}

export async function createStory(user, story) {
  const storyRef = await addDoc(collection(db, 'stories'), {
    ...story,
    userId: user.id,
    author: { name: user.name || '', avatar: user.avatar || '' },
    viewedBy: [user.id],
    createdAt: serverTimestamp(),
  });
  const snapshot = await getDoc(storyRef);
  return {
    ...fromDocument(snapshot),
    isViewed: true,
    timestamp: toDisplayTime(snapshot.data().createdAt) || toDisplayTime(new Date()),
  };
}

export async function markStoryViewed(storyId, userId) {
  await updateDoc(doc(db, 'stories', storyId), { viewedBy: arrayUnion(userId) });
}

export async function fetchCircles(userId) {
  const snapshot = await getDocs(query(
    collection(db, 'circles'),
    where('memberIds', 'array-contains', userId),
  ));
  return snapshot.docs.map((circleSnapshot) => {
    const circle = fromDocument(circleSnapshot);
    return { ...circle, members: circle.memberIds?.length || 0 };
  });
}

export async function createCircle(userId, circle) {
  const circleRef = await addDoc(collection(db, 'circles'), {
    ...circle,
    creatorId: userId,
    memberIds: [userId],
    createdAt: serverTimestamp(),
  });
  const snapshot = await getDoc(circleRef);
  const created = fromDocument(snapshot);
  return { ...created, members: 1 };
}

export async function fetchMoments(userId) {
  const circlesSnapshot = await getDocs(query(
    collection(db, 'circles'),
    where('memberIds', 'array-contains', userId),
  ));
  const momentQueries = [
    getDocs(query(
      collection(db, 'moments'),
      where('circleId', '==', null),
    )),
    ...circlesSnapshot.docs.map((circleSnapshot) => getDocs(query(
      collection(db, 'moments'),
      where('circleId', '==', circleSnapshot.id),
    ))),
  ];
  const snapshots = await Promise.all(momentQueries);
  const moments = snapshots.flatMap((snapshot) => snapshot.docs.map((momentSnapshot) => {
    const moment = fromDocument(momentSnapshot);
    return {
      ...moment,
      time: toDisplayDateTime(moment.createdAt) || moment.time,
    };
  }));
  return moments.sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
}

export async function createMoment(user, moment) {
  const momentRef = await addDoc(collection(db, 'moments'), {
    ...moment,
    circleId: moment.circleId || null,
    authorId: user.id,
    author: { name: user.name || '', avatar: user.avatar || '' },
    createdAt: serverTimestamp(),
  });
  const snapshot = await getDoc(momentRef);
  const created = fromDocument(snapshot);
  return { ...created, time: toDisplayDateTime(created.createdAt) || toDisplayDateTime(new Date()) };
}

export async function fetchDiscoverProfiles(userId) {
  const snapshot = await getDocs(collection(db, 'profiles'));
  return snapshot.docs
    .filter((profile) => profile.id !== userId)
    .map((profile) => {
      const data = profile.data();
      return {
        id: profile.id,
        name: data.name || '',
        username: data.username || '',
        avatar: data.avatar || '',
        bio: data.bio || '',
        vibe: data.vibe || '',
        isOnline: false,
      };
    });
}

export async function sendConnectionRequest(senderId, recipientId) {
  const connectionId = `${senderId}_${recipientId}`;
  const connectionRef = doc(db, 'connections', connectionId);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(connectionRef);
    if (existing.exists()) {
      throw new Error('You have already sent a connection request to this user.');
    }
    transaction.set(connectionRef, {
      senderId,
      recipientId,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  });
}

export async function updateUserProfiles(user, profile) {
  const editableFields = ['bio', 'vibe', 'avatar'];
  const updates = Object.fromEntries(editableFields
    .filter((key) => profile[key] !== undefined)
    .map((key) => [key, profile[key]]));
  const nextUser = { ...user, ...updates };
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', user.id), updates, { merge: true });
  batch.set(doc(db, 'profiles', user.id), updates, { merge: true });
  await batch.commit();
  return nextUser;
}

export async function fetchAdminDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [profilesCount, activeCount, profilesSnapshot] = await Promise.all([
    getCountFromServer(collection(db, 'profiles')),
    getCountFromServer(query(
      collection(db, 'profiles'),
      where('lastSeenAt', '>=', Timestamp.fromDate(today)),
    )),
    getDocs(collection(db, 'users')),
  ]);
  return {
    analytics: {
      totalAccounts: profilesCount.data().count,
      activeToday: activeCount.data().count,
      transcriptsProcessed: '—',
      pendingReports: '—',
    },
    users: profilesSnapshot.docs.map(fromDocument),
  };
}

export async function suspendUser(userId) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', userId), { status: 'suspended' });
  batch.set(doc(db, 'profiles', userId), { status: 'suspended' }, { merge: true });
  await batch.commit();
}
