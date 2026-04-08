import * as ImagePicker from 'expo-image-picker';


// Ouvrir la galerie
export async function pickImageToGallery() {
  // demander permission
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    alert("Permission refusée");
    return;
  }

  // ouvrir galerie
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });

  if (!result.canceled) {
  
    const uri = result.assets[0].uri;
    console.log(uri);
    return uri;
  }
};

//Ouvrir la caméra

export async function takePhoto() {

  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    alert("Permission refusée");
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.7,
  });

  if (!result.canceled) {
    console.log(result.assets[0].uri);
   return result.assets[0].uri;
   
  }
};

export function uriToBlob(uri: string): FormData {
  const form = new FormData();
  const ext = uri.split('.').pop() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  form.append('file', {
    uri,
    name: `${Date.now()}.${ext}`,
    type: mimeType,
  } as any);
  return form;
}

