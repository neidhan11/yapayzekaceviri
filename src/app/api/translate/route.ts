import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const LANGUAGE_NAMES: { [key: string]: string } = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ar: 'العربية',
  ko: '한국어'
}

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLanguage, targetLanguage } = await request.json()
    
    console.log('🤖 API Çeviri İsteği:', { text, sourceLanguage, targetLanguage })

    if (!text || !sourceLanguage || !targetLanguage) {
      console.log('❌ Eksik parametreler')
      return NextResponse.json(
        { error: 'Eksik parametreler' },
        { status: 400 }
      )
    }

    // Check for minimum text length and very short texts
    if (text.trim().length < 2) {
      console.log('❌ Metin çok kısa')
      return NextResponse.json({
        translatedText: text,
        message: 'Metin çok kısa, çeviri yapılmadı',
        needsMoreText: true
      })
    }

    // Handle very short words or incomplete texts - don't call AI for very short texts
    if (text.trim().length <= 3) {
      console.log('📝 Kısa metin doğrudan çevriliyor:', text)
      
      // Simple word mappings for common short words
      const shortTranslations: { [key: string]: { [key: string]: string } } = {
        'me': { 'en': 'me', 'de': 'mich', 'fr': 'moi', 'es': 'mí' },
        'sen': { 'en': 'you', 'de': 'du', 'fr': 'tu', 'es': 'tú' },
        'ben': { 'en': 'I', 'de': 'ich', 'fr': 'je', 'es': 'yo' },
        'hi': { 'tr': 'merhaba', 'de': 'hallo', 'fr': 'salut', 'es': 'hola' },
        'hello': { 'tr': 'merhaba', 'de': 'hallo', 'fr': 'salut', 'es': 'hola' },
        'ok': { 'tr': 'tamam', 'de': 'ok', 'fr': 'd\'accord', 'es': 'ok' },
        'evet': { 'en': 'yes', 'de': 'ja', 'fr': 'oui', 'es': 'sí' },
        'hayır': { 'en': 'no', 'de': 'nein', 'fr': 'non', 'es': 'no' },
        'teşekkür': { 'en': 'thanks', 'de': 'danke', 'fr': 'merci', 'es': 'gracias' }
      }
      
      const lowerText = text.trim().toLowerCase()
      const translation = shortTranslations[lowerText]?.[targetLanguage] || text.trim()
      
      return NextResponse.json({
        translatedText: translation,
        message: 'Kısa metin',
        isShortText: true
      })
    }

    if (sourceLanguage === targetLanguage) {
      console.log('🔄 Aynı dil, çeviri gerekmiyor')
      return NextResponse.json({
        translatedText: text,
        message: 'Kaynak ve hedef dil aynı'
      })
    }

    console.log('🧠 ZAI SDK başlatılıyor...')
    const zai = await ZAI.create()

    const systemPrompt = `Sen profesyonel bir çevirmensin. Verilen metni ${LANGUAGE_NAMES[sourceLanguage]} dilinden ${LANGUAGE_NAMES[targetLanguage]} diline çevir. 
    Çevirini yaparken şu kurallara uymalısın:
    1. Anlamı tam olarak koru
    2. Doğal ve akıcı bir dil kullan
    3. Kültürel ifadeleri hedef dile uygun şekilde çevir
    4. Teknik terimleri doğru çevir
    5. Cümle yapısını hedef dilin gramer kurallarına uygun şekilde düzenle
    6. Sadece çeviriyi döndür, açıklama yapma veya başka metin ekleme
    7. Kısa ve eksik metinler için bile en iyi tahmininde çeviri yap, asla "metin yetersiz" gibi hata verme
    
    ÖZEL İNGİLİZCE ÇEVİRİ KURALLARI (eğer İngilizceye çeviri yapıyorsan):
    - Farklı soruları ayrı cümlelerde yaz: "Who are you?" ve "How are you?" → "Who are you? How are you?"
    - Negatif cümlelerde "also" yerine cümle sonuna "either" koy: "I also don't know you" → "I don't know you, either."
    - Selamlaşmaları "Hello," veya "Hi," ile başlat, "I'm" veya "my name is" kullan
    - Türkçedeki "ama" vurgusu için İngilizcede cümle sonuna "though" ekle: "..., though."
    - Günlük konuşmada "How are you doing?" daha doğal
    - Kısa kelimeler için doğrudan çeviri yap: "me" → "me", "sen" → "you"`

    const userPrompt = `Lütfen aşağıdaki metni ${LANGUAGE_NAMES[sourceLanguage]} dilinden ${LANGUAGE_NAMES[targetLanguage]} diline çevir:

${text}`

    console.log('💬 AI prompt gönderiliyor...')
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    console.log('🎯 AI yanıtı alındı:', completion)

    const translatedText = completion.choices[0]?.message?.content?.trim()

    if (!translatedText) {
      console.log('❌ Çeviri sonucu boş')
      throw new Error('Çeviri sonucu alınamadı')
    }

    console.log('✅ Başarılı çeviri:', translatedText)

    return NextResponse.json({
      translatedText,
      sourceLanguage,
      targetLanguage,
      originalText: text
    })

  } catch (error) {
    console.error('❌ Translation API Error:', error)
    
    return NextResponse.json(
      { error: 'Çeviri sırasında bir hata oluştu' },
      { status: 500 }
    )
  }
}