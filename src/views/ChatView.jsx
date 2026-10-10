import { useContext, useState, useEffect, useRef } from 'react';
import { Search, Plus, Mic, MicOff, Send, Smile, Paperclip, MoreVertical, Phone, Video, Check, CheckCheck, ChevronLeft, Play, Pause, Sparkles, Filter, Globe } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { RouterContext } from '../contexts/RouterContext';
import { useData } from '../contexts/useData';
import { Avatar } from '../components/ui/Avatar';
import { IconButton } from '../components/ui/IconButton';
import { FetchState } from '../components/ui/FetchState';
import { uploadMedia } from '../services/storage';

export const ChatView = () => {
  const { chats, users, loading, errors, refreshChats, refreshChatMessages, sendMessage, addReaction, toggleSaveMessage, votePoll, setActiveCall, showToast } = useData();
  const { routeParams, navigate } = useContext(RouterContext);
  const { user } = useAuth();

  const [selectedChatId, setSelectedChatId] = useState(null);
  const activeChatId = routeParams.chatId || selectedChatId || chats[0]?.id;
  const [inputText, setInputText] = useState('');
  const [audioSpeed, setAudioSpeed] = useState('1x');
  const [isPlayingAudio, setIsPlayingAudio] = useState({});
  const [showTranscript, setShowTranscript] = useState({});
  const [showTranslation, setShowTranslation] = useState({});
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayersRef = useRef({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const isGroup = activeChat?.isGroup;
  const participants = Array.isArray(activeChat?.participants) ? activeChat.participants : [];
  const otherUser = !isGroup ? users.find(u => participants.includes(u.id) && u.id !== user.id) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;
    try {
      await sendMessage(activeChat.id, inputText.trim());
      setInputText('');
      setRecordingError('');
    } catch (error) {
      setRecordingError(error.message);
    }
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Voice recording is not supported by this browser.');
      return;
    }
    try {
      setRecordingError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => setRecordingError('The voice recording could not be completed.');
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        try {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (!blob.size) throw new Error('No audio was captured.');
          const audioUrl = await uploadMedia(blob, 'audio');
          await sendMessage(activeChat.id, '', 'voice', { audioUrl });
          showToast('Voice message sent! 🎙️');
        } catch (error) {
          setRecordingError(error.message);
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setRecordingError(error.message || 'Microphone access was denied.');
    }
  };

  const toggleAudio = async (message) => {
    const currentPlayer = audioPlayersRef.current[message.id];
    if (currentPlayer && !currentPlayer.paused) {
      currentPlayer.pause();
      setIsPlayingAudio((current) => ({ ...current, [message.id]: false }));
      return;
    }
    try {
      const player = currentPlayer || new Audio(message.audioUrl);
      player.playbackRate = Number.parseFloat(audioSpeed);
      player.onended = () => setIsPlayingAudio((current) => ({ ...current, [message.id]: false }));
      audioPlayersRef.current[message.id] = player;
      await player.play();
      setIsPlayingAudio((current) => ({ ...current, [message.id]: true }));
    } catch (error) {
      showToast(error.message || 'Unable to play this voice message.');
    }
  };

  return (
    <div className="flex-1 flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden pb-16 md:pb-0">
      
      {/* Conversations Sidebar (Left) */}
      <div className={`w-full md:w-80 lg:w-96 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col ${routeParams.chatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h1>
          <div className="flex items-center space-x-1">
            <IconButton icon={Plus} title="New Chat" onClick={() => showToast('Select a user from Discover to chat!')} />
            <IconButton icon={Filter} title="Filter Chats" />
          </div>
        </div>

        {/* Search Chat */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search chats & transcripts..." 
              className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white text-xs pl-9 pr-4 py-2.5 rounded-2xl border border-transparent focus:border-violet-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Chat List */}
        <FetchState loading={loading.chats} error={errors.chats} onRetry={refreshChats}>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 p-2 space-y-1">
          {chats.map(chat => {
            const chatIsGroup = chat.isGroup;
            const chatParticipants = Array.isArray(chat.participants) ? chat.participants : [];
            const targetUser = !chatIsGroup ? users.find(u => chatParticipants.includes(u.id) && u.id !== user.id) : null;
            const lastMsg = chat.messages?.[chat.messages.length - 1];
            const isSelected = chat.id === activeChatId;

            return (
              <div 
                key={chat.id}
                onClick={() => {
                  setSelectedChatId(chat.id);
                  navigate('/chats', { chatId: chat.id });
                }}
                className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all ${isSelected ? 'bg-violet-50 dark:bg-violet-950/40 border border-violet-200/50 dark:border-violet-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
              >
                {chatIsGroup ? (
                  <img src={chat.groupAvatar} className="w-12 h-12 rounded-full object-cover shrink-0" alt="Group" />
                ) : (
                  <Avatar src={targetUser?.avatar} isOnline={targetUser?.isOnline} vibe={targetUser?.vibe} />
                )}

                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {chatIsGroup ? chat.groupName : targetUser?.name}
                    </h3>
                    <span className="text-[10px] text-slate-400">{lastMsg?.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {lastMsg?.type === 'voice' ? '🎙️ Voice note' : lastMsg?.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        </FetchState>
      </div>

      {/* Main Conversation Window (Right) */}
      <div className={`flex-1 flex flex-col bg-slate-100/50 dark:bg-slate-900/50 ${!routeParams.chatId && 'hidden md:flex'}`}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="bg-white dark:bg-slate-950 p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between shadow-sm sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <button onClick={() => navigate('/chats')} className="md:hidden text-slate-500">
                  <ChevronLeft size={22} />
                </button>
                {isGroup ? (
                  <img src={activeChat.groupAvatar} className="w-10 h-10 rounded-full object-cover" alt="Group" />
                ) : (
                  <Avatar src={otherUser?.avatar} size="sm" isOnline={otherUser?.isOnline} />
                )}
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {isGroup ? activeChat.groupName : otherUser?.name}
                  </h2>
                  <p className="text-[11px] text-emerald-500 font-medium">
                    {activeChat.typingUsers?.length
                      ? 'Typing...'
                      : isGroup ? `${participants.length} members` : (otherUser?.isOnline ? 'Online now' : 'Offline')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <IconButton icon={Phone} title="Voice Call" onClick={() => setActiveCall({ user: otherUser, type: 'voice' })} />
                <IconButton icon={Video} title="Video Call" onClick={() => setActiveCall({ user: otherUser, type: 'video' })} />
                <IconButton icon={MoreVertical} title="Chat Options" />
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex justify-center my-2">
                <span className="text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                  End-to-end encrypted • Disappearing messages Off
                </span>
              </div>

              <FetchState
                loading={loading[`messages:${activeChat.id}`]}
                error={errors[`chat:${activeChat.id}`]}
                onRetry={() => refreshChatMessages(activeChat.id).catch((error) => showToast(error.message))}
              >
              {(activeChat.messages || []).length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">No messages in this conversation yet.</p>
              )}
              {(activeChat.messages || []).map((msg) => {
                const isMe = msg.senderId === user.id;

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`max-w-[80%] md:max-w-[65%] space-y-1`}>
                      
                      {/* Bubble */}
                      <div className={`p-3.5 rounded-3xl shadow-sm relative text-sm ${isMe ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-br-xs' : 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-800/80'}`}>
                        
                        {/* Voice Message Player Layout */}
                        {msg.type === 'voice' ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-3">
                              <button 
                                onClick={() => toggleAudio(msg)}
                                className={`p-2.5 rounded-full ${isMe ? 'bg-white/20 text-white' : 'bg-violet-600 text-white'}`}
                              >
                                {isPlayingAudio[msg.id] ? <Pause size={16} /> : <Play size={16} />}
                              </button>
                              
                              {/* Simulated Waveform */}
                              <div className="flex-1 flex items-center space-x-1 h-6">
                                {[40, 75, 30, 90, 60, 100, 45, 80, 50, 95, 35, 70].map((h, i) => (
                                  <div key={i} className={`flex-1 rounded-full transition-all ${isMe ? 'bg-white/60' : 'bg-violet-500'}`} style={{ height: `${h}%` }}></div>
                                ))}
                              </div>

                              <span className="text-xs opacity-80">{msg.duration}</span>
                              <button 
                                onClick={() => {
                                  const nextSpeed = audioSpeed === '1x' ? '1.5x' : audioSpeed === '1.5x' ? '2x' : '1x';
                                  setAudioSpeed(nextSpeed);
                                  if (audioPlayersRef.current[msg.id]) {
                                    audioPlayersRef.current[msg.id].playbackRate = Number.parseFloat(nextSpeed);
                                  }
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/10"
                              >
                                {audioSpeed}
                              </button>
                            </div>

                            {/* AI Voice Transcript Button */}
                            {msg.transcript && (
                              <div className="pt-2 border-t border-current/10">
                                <button 
                                  onClick={() => setShowTranscript(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                                  className="text-[11px] font-semibold flex items-center space-x-1 opacity-90 hover:underline"
                                >
                                  <Sparkles size={12} />
                                  <span>{showTranscript[msg.id] ? 'Hide AI Transcript' : 'View AI Transcript'}</span>
                                </button>
                                {showTranscript[msg.id] && (
                                  <p className="text-xs italic mt-1.5 p-2 rounded-xl bg-black/10 dark:bg-white/10">
                                    "{msg.transcript}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : msg.type === 'poll' ? (
                          /* Poll Layout */
                          <div className="space-y-3">
                            <p className="font-bold">{msg.question}</p>
                            <div className="space-y-2">
                              {msg.options.map((opt) => {
                                const percent = Math.round((opt.votes / (msg.totalVotes || 1)) * 100);
                                return (
                                  <div 
                                    key={opt.id}
                                    onClick={() => votePoll(activeChat.id, msg.id, opt.id).catch((error) => showToast(error.message))}
                                    className="relative p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900 cursor-pointer overflow-hidden text-slate-900 dark:text-white"
                                  >
                                    <div className="absolute left-0 top-0 bottom-0 bg-violet-500/20 transition-all" style={{ width: `${percent}%` }}></div>
                                    <div className="relative flex justify-between text-xs font-semibold">
                                      <span>{opt.text}</span>
                                      <span>{percent}% ({opt.votes})</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* Standard Text Layout */
                          <p>{msg.text}</p>
                        )}

                        {/* Translation Toggle */}
                        {msg.translation && (
                          <div className="mt-2 pt-2 border-t border-current/10">
                            <button 
                              onClick={() => setShowTranslation(p => ({ ...p, [msg.id]: !p[msg.id] }))}
                              className="text-[11px] font-semibold flex items-center space-x-1 opacity-90"
                            >
                              <Globe size={12} />
                              <span>{showTranslation[msg.id] ? 'Original' : 'Translate Message'}</span>
                            </button>
                            {showTranslation[msg.id] && (
                              <p className="text-xs font-medium mt-1 text-emerald-300">
                                Translation: "{msg.translation}"
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end space-x-1.5 mt-1">
                          <span className="text-[10px] opacity-70">{msg.timestamp}</span>
                          {isMe && (msg.status === 'read'
                            ? <CheckCheck size={14} className="opacity-80" />
                            : <Check size={14} className="opacity-80" />)}
                        </div>
                      </div>

                      {/* Action icons on hover */}
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                        <button onClick={() => addReaction(activeChat.id, msg.id, '❤️').catch((error) => showToast(error.message))} className="text-xs hover:scale-125 transition-transform">❤️</button>
                        <button onClick={() => addReaction(activeChat.id, msg.id, '🔥').catch((error) => showToast(error.message))} className="text-xs hover:scale-125 transition-transform">🔥</button>
                        <button onClick={() => toggleSaveMessage(msg)} className="text-xs text-slate-400 hover:text-amber-400">⭐</button>
                      </div>

                    </div>
                  </div>
                );
              })}
              </FetchState>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80">
              <form onSubmit={handleSend} className="flex items-center space-x-2 max-w-4xl mx-auto">
                <IconButton icon={Paperclip} title="Attach media" onClick={() => showToast('Attachment options open!')} />
                
                <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center px-4 py-2 border border-transparent focus-within:border-violet-500 transition-all">
                  <Smile size={20} className="text-slate-400 mr-2 shrink-0" />
                  <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a vibe or message..."
                    className="w-full bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {inputText.trim() ? (
                  <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white p-3 rounded-2xl transition-transform active:scale-95 shadow-md shadow-violet-500/20">
                    <Send size={18} />
                  </button>
                ) : (
                  <button type="button" onClick={handleVoiceRecord} title={isRecording ? 'Stop recording' : 'Record voice message'} className={`text-white p-3 rounded-2xl transition-transform active:scale-95 ${isRecording ? 'bg-rose-600' : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800'}`}>
                    {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}
              </form>
              {recordingError && <p className="max-w-4xl mx-auto mt-2 text-xs text-rose-500" role="alert">{recordingError}</p>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">Select a conversation to start chatting</div>
        )}
      </div>

    </div>
  );
};
