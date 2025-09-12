// src/utils/encoding.js

/**
 * Decodifica texto con problemas de encoding
 */
export const decodeText = (text) => {
  if (typeof text !== 'string') return text;
  
  // Mapeo de caracteres corruptos a caracteres correctos
  const encodingMap = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã±': 'ñ', 'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã“': 'Ó',
    'Ãš': 'Ú', 'Ã‘': 'Ñ', 'Â¢': 'ó', 'Â£': 'í', 'Â¥': 'é',
    'Â¡': 'ñ', '¢': 'ó', '£': 'í', '¥': 'é', '¡': 'ñ',
    '¾': 'ó', 'Ý': 'í', 'Ú': 'é', '±': 'ñ'
  };

  let decodedText = text;
  Object.keys(encodingMap).forEach(badChar => {
    decodedText = decodedText.replace(new RegExp(badChar, 'g'), encodingMap[badChar]);
  });

  return decodedText;
};

/**
 * Función para decodificar objetos completos
 */
export const decodeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const decoded = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      decoded[key] = decodeText(obj[key]);
    } else if (typeof obj[key] === 'object') {
      decoded[key] = decodeObject(obj[key]);
    } else {
      decoded[key] = obj[key];
    }
  }
  
  return decoded;
};

export default decodeText;