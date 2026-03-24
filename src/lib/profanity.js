// Common profanity filter - Turkish, English, Spanish, German, French, Portuguese
const BAD_WORDS = [
  // Turkish
  'sik','siki','sikim','sikik','orospu','orospuçocuğu','göt','götü','amk','amına','amını','piç','oç',
  'orospu','pezevenk','ibne','bok','boktan','yarrak','yarak','dalyarak','oğlancı','götveren',
  'sürtük','kahpe','kaltak','opoğlu','salak','aptal','gerizekalı','mal','dangalak',
  // English
  'fuck','fucking','fucked','fucker','shit','shitting','ass','asshole','bitch','cunt','dick',
  'pussy','cock','whore','nigger','nigga','faggot','retard','bastard','prick','twat',
  // Spanish
  'puta','puto','coño','mierda','joder','hostia','pendejo','cabrón','cabron','maricón','maricon',
  'chinga','chingada','verga','culo','polla','gilipollas',
  // German
  'scheiße','scheisse','scheiß','hurensohn','arschloch','wichser','fotze','fick','nazi',
  // French
  'merde','putain','connard','salope','enculé','encule','batard','couille','nique','chier',
  // Portuguese
  'porra','caralho','fodase','foda','buceta','merda','viado','cuzão','cuzao',
  // Universal hate
  'nazi','hitler','kkk',
]

// normalize: lowercase, remove accents and special chars for matching
function normalize(str) {
  return str.toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõöø]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ýÿ]/g, 'y')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[ğ]/g, 'g')
    .replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i')
    .replace(/[ö]/g, 'o')
    .replace(/[ü]/g, 'u')
    .replace(/[^a-z0-9]/g, '')
}

export function containsProfanity(text) {
  const normalized = normalize(text)
  return BAD_WORDS.some(word => normalized.includes(normalize(word)))
}
