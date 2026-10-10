import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../../firebase';

export async function uploadMedia(file, mediaType = 'image') {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before uploading media.');
  if (!(file instanceof Blob)) {
    throw new TypeError('Media uploads require a File or Blob.');
  }

  const extension = mediaType === 'audio'
    ? 'webm'
    : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const mediaRef = ref(storage, `users/${user.uid}/media/${fileName}`);
  await uploadBytes(mediaRef, file, {
    contentType: file.type || (mediaType === 'audio' ? 'audio/webm' : 'image/jpeg'),
  });
  return getDownloadURL(mediaRef);
}
