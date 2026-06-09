import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

import { showErrorToast } from '@/lib/toast';

const MAX_UPLOAD_WIDTH = 1280;
const UPLOAD_COMPRESS_QUALITY = 0.65;

// Ouvrir la galerie
export async function pickImageToGallery() {
  // ouvrir galerie
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  } else {
    return undefined;
  }
}

//Ouvrir la caméra

export async function takePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    showErrorToast('Permission refusée', 'Permission refusée');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.7,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  } else {
    return undefined;
  }
}

function getImageSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null)
    );
  });
}

async function prepareImageForUpload(uri: string): Promise<string> {
  const imageSize = await getImageSize(uri);
  const actions =
    imageSize && imageSize.width > MAX_UPLOAD_WIDTH
      ? [{ resize: { width: MAX_UPLOAD_WIDTH } }]
      : [];

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: UPLOAD_COMPRESS_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return result.uri;
}

export async function uriToBlob(uri: string): Promise<FormData> {
  const optimizedUri = await prepareImageForUpload(uri);
  const form = new FormData();
  form.append('file', {
    uri: optimizedUri,
    name: `${Date.now()}.jpg`,
    type: 'image/jpeg',
  } as any);
  return form;
}
