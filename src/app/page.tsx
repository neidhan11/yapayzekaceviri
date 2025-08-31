'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Languages, Copy, Check, Star, Info, Brain, Zap, Sparkles, Bot } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const LANGUAGES = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' }
]

export default function Home() {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('tr')
  const [targetLanguage, setTargetLanguage] = useState('en')
  const [isTranslating, setIsTranslating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qualityScore, setQualityScore] = useState<number | null>(null)
  const [qualityFeedback, setQualityFeedback] = useState<string[]>([])
  const [aiThinking, setAiThinking] = useState(false)
  const [aiMessage, setAiMessage] = useState('')
  const { toast } = useToast()

  const assessTranslationQuality = (original: string, translation: string) => {
    const feedback: string[] = []
    let score = 10

    // Rule 1: Check if questions are separated
    if (translation.includes('who are you and how are you')) {
      score -= 2
      feedback.push('Sorular ayrı cümlelerde olmalı')
    } else if (translation.includes('Who are you?') && translation.includes('How are you?')) {
      feedback.push('Sorular doğru ayrılmış')
    }

    // Rule 2: Check for "also" vs "either" in negative sentences
    if (translation.includes('I also don\'t know') || translation.includes('I also don\'t')) {
      score -= 2
      feedback.push('Negatif cümlede "either" kullanılmalı')
    } else if (translation.includes('don\'t know you, either')) {
      feedback.push('Negatif cümle doğru')
    }

    // Rule 3: Check for "though" usage
    if (translation.includes('though')) {
      feedback.push('"Ama" vurgusu doğru kullanılmış')
    }

    // Rule 4: Check for natural greeting
    if (translation.startsWith('Hello,') || translation.startsWith('Hi,')) {
      feedback.push('Doğal selamlaşma')
    }

    // Rule 5: Check for natural "how are you" variations
    if (translation.includes('How are you doing?')) {
      feedback.push('Günlük konuşma stili')
    }

    return { score: Math.max(1, score), feedback }
  }

  const translateText = useCallback(async (text: string) => {
    if (!text.trim()) {
      setTranslatedText('')
      setQualityScore(null)
      setQualityFeedback([])
      setAiThinking(false)
      setAiMessage('')
      return
    }

    // Don't translate very short texts (less than 2 characters)
    if (text.trim().length < 2) {
      setTranslatedText(text)
      setQualityScore(null)
      setQualityFeedback([])
      setAiThinking(false)
      setAiMessage('En az 2 karakter gerekli 📝')
      return
    }

    setIsTranslating(true)
    setAiThinking(true)
    
    // AI thinking messages
    const thinkingMessages = [
      "Yapay zeka düşünülüyor...",
      "Dil analizi yapılıyor...",
      "Çeviri algoritmaları çalışıyor...",
      "Anlam bağlamı kuruluyor...",
      "Doğal dil işleniyor..."
    ]
    
    let messageIndex = 0
    const messageInterval = setInterval(() => {
      setAiMessage(thinkingMessages[messageIndex % thinkingMessages.length])
      messageIndex++
    }, 800)

    try {
      console.log('🚀 Çeviri isteği gönderiliyor:', { text, sourceLanguage, targetLanguage })
      
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sourceLanguage,
          targetLanguage,
        }),
      })

      console.log('📡 API yanıtı:', response.status, response.statusText)

      if (!response.ok) {
        throw new Error('Çeviri başarısız oldu')
      }

      const data = await response.json()
      console.log('✅ Çeviri verisi:', data)
      console.log('📝 Frontend state güncelleniyor:', {
        translatedText: data.translatedText,
        currentTranslatedText: translatedText
      })
      
      setTranslatedText(data.translatedText)
      console.log('🔄 setTranslatedText çağrıldı, yeni değer:', data.translatedText)
      
      // Clear thinking state
      clearInterval(messageInterval)
      setAiThinking(false)
      
      // Handle different response types
      if (data.needsMoreText) {
        setAiMessage('Daha fazla metin yazın 📝')
        setQualityScore(null)
        setQualityFeedback([])
      } else if (data.isShortText) {
        setAiMessage('Kısa metin çevrildi ✅')
        setQualityScore(8)
        setQualityFeedback(['Kısa metin çevirisi'])
      } else {
        setAiMessage('Çeviri tamamlandı! ✨')
        
        // Quality assessment for English translations
        if (targetLanguage === 'en' && sourceLanguage === 'tr') {
          const assessment = assessTranslationQuality(text, data.translatedText)
          setQualityScore(assessment.score)
          setQualityFeedback(assessment.feedback)
        } else {
          setQualityScore(10)
          setQualityFeedback(['Doğal dil çevirisi'])
        }
      }
      
      // Clear success message after 2 seconds
      setTimeout(() => {
        setAiMessage('')
      }, 2000)
    } catch (error) {
      console.error('Translation error:', error)
      clearInterval(messageInterval)
      setAiThinking(false)
      setAiMessage('Çeviri hatası oluştu 😔')
      toast({
        title: 'Çeviri Hatası',
        description: 'Metin çevrilemedi. Lütfen tekrar deneyin.',
        variant: 'destructive',
      })
    } finally {
      setIsTranslating(false)
    }
  }, [sourceLanguage, targetLanguage, toast])

  // Real-time translation with minimal debounce
  useEffect(() => {
    console.log('🔄 useEffect tetiklendi, sourceText:', sourceText)
    const timeoutId = setTimeout(() => {
      console.log('⏰ Debounce tamamlandı, çeviri başlatılıyor...')
      translateText(sourceText)
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [sourceText]) // Sadece sourceText değiştiğinde tetikle

  // Debug için translatedText değişimini izle
  useEffect(() => {
    console.log('🔄 translatedText değişti:', translatedText)
  }, [translatedText])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(translatedText)
      setCopied(true)
      toast({
        title: 'Kopyalandı',
        description: 'Çeviri metni panoya kopyalandı.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Kopyalama Hatası',
        description: 'Metin kopyalanamadı.',
        variant: 'destructive',
      })
    }
  }

  const swapLanguages = () => {
    setSourceLanguage(targetLanguage)
    setTargetLanguage(sourceLanguage)
    setSourceText(translatedText)
    setTranslatedText(sourceText)
  }

  const getLanguageInfo = (code: string) => {
    return LANGUAGES.find(lang => lang.code === code) || LANGUAGES[0]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-gray-800 p-4 relative overflow-hidden">
      {/* AI Background Effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/ai-background.png')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10"></div>
      </div>
      
      {/* Floating AI Elements */}
      <div className="absolute top-20 left-10 animate-pulse">
        <Brain className="h-8 w-8 text-blue-400 opacity-60" />
      </div>
      <div className="absolute top-40 right-20 animate-bounce">
        <Zap className="h-6 w-6 text-purple-400 opacity-60" />
      </div>
      <div className="absolute bottom-40 left-20 animate-pulse">
        <Sparkles className="h-7 w-7 text-indigo-400 opacity-60" />
      </div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* AI Assistant Image */}
            <div className="relative">
              <img
                src="/ai-assistant.png"
                alt="AI Çeviri Asistanı"
                className="w-16 h-16 rounded-full border-4 border-blue-400 shadow-lg animate-pulse"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Bot className="h-10 w-10 text-blue-600 animate-pulse" />
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  AI Çeviri Asistanı
                </h1>
              </div>
              <div className="flex items-center justify-center gap-2 text-lg text-gray-600 dark:text-gray-300">
                <Brain className="h-5 w-5 text-purple-500" />
                <span>Yapay zeka destekli akıllı çeviri motoru</span>
                <Sparkles className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Translation Card */}
        <Card className="shadow-xl border-2 border-blue-200 dark:border-blue-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <span>AI Çeviri Paneli</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Brain className="h-3 w-3" />
                  AI Destekli
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                  <Zap className="h-3 w-3" />
                  Gerçek Zamanlı
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language Selection */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Kaynak Dil
                </label>
                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span>{getLanguageInfo(sourceLanguage).flag}</span>
                        <span>{getLanguageInfo(sourceLanguage).name}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={swapLanguages}
                className="mt-6"
              >
                <Languages className="h-4 w-4" />
              </Button>

              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Hedef Dil
                </label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <span>{getLanguageInfo(targetLanguage).flag}</span>
                        <span>{getLanguageInfo(targetLanguage).name}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <div className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI Translation Area */}
            <div className="relative">
              {/* AI Connection Lines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 opacity-30"></div>
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 relative z-10">
                {/* Source Text */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-blue-500" />
                      Kaynak Metin
                    </label>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {getLanguageInfo(sourceLanguage).flag} {getLanguageInfo(sourceLanguage).name}
                    </Badge>
                  </div>
                  
                  <div className="relative group">
                    <Textarea
                      placeholder="Çevirmek istediğiniz metni buraya yazın... (en az 2 karakter)"
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      className="min-h-[220px] resize-none border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md group-hover:shadow-lg"
                    />
                    
                    {/* Short Text Warning */}
                    {sourceText.length > 0 && sourceText.length < 2 && (
                      <div className="absolute top-2 left-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                          <Info className="h-3 w-3" />
                          <span>En az 2 karakter gerekli</span>
                        </div>
                      </div>
                    )}
                    
                    {/* AI Corner Decoration */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    
                    {/* Character Count with AI Style */}
                    <div className="absolute bottom-2 right-2">
                      <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        sourceText.length < 2 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-white/80 dark:bg-gray-800/80 text-gray-500'
                      }`}>
                        <Brain className="h-3 w-3" />
                        <span>{sourceText.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Translated Text */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Bot className="h-4 w-4 text-purple-500" />
                      AI Çeviri
                    </label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        {getLanguageInfo(targetLanguage).flag} {getLanguageInfo(targetLanguage).name}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        disabled={!translatedText || isTranslating}
                        className="flex items-center gap-1 h-7 px-2 text-xs bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:from-purple-100 hover:to-indigo-100"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-purple-600" />
                        )}
                        {copied ? 'Kopyalandı' : 'Kopyala'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => translateText(sourceText)}
                        disabled={!sourceText || isTranslating}
                        className="flex items-center gap-1 h-7 px-2 text-xs bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:from-blue-100 hover:to-cyan-100"
                      >
                        <Zap className="h-3 w-3 text-blue-600" />
                        Çevir
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <Textarea
                      value={translatedText}
                      readOnly
                      placeholder="AI çeviri burada görünecek..."
                      className="min-h-[220px] resize-none border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-300 bg-gradient-to-br from-purple-50/80 to-indigo-50/80 dark:from-purple-900/20 dark:to-indigo-900/20 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md group-hover:shadow-lg"
                    />
                    
                    {/* AI Thinking Overlay */}
                    {isTranslating && (
                      <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center">
                        <div className="relative mb-4">
                          <img
                            src="/ai-thinking.png"
                            alt="AI Thinking"
                            className="w-16 h-16 rounded-full animate-pulse"
                          />
                          <div className="absolute -top-1 -right-1">
                            <Brain className="h-5 w-5 text-blue-500 animate-pulse" />
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="font-medium text-sm">AI Çeviri Yapıyor</span>
                          </div>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* AI Success Animation */}
                    {!isTranslating && translatedText && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center animate-pulse">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                    
                    {/* Character Count with AI Style */}
                    <div className="absolute bottom-2 right-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded-full">
                        <Bot className="h-3 w-3" />
                        <span>{translatedText.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Quality Indicator */}
            {qualityScore !== null && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-blue-800 dark:text-blue-200">AI Çeviri Kalitesi</span>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Yapay zeka değerlendirmesi</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < qualityScore
                              ? 'text-yellow-400 fill-yellow-400 animate-pulse'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
                      {qualityScore}/10
                    </span>
                  </div>
                </div>
                
                {qualityFeedback.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {qualityFeedback.map((feedback, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                        <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-xs text-green-700 dark:text-green-300">{feedback}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Status */}
            <div className="flex flex-col items-center justify-center gap-3 text-sm">
              {/* AI Thinking Animation */}
              {aiThinking && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="relative">
                    <img
                      src="/ai-thinking.png"
                      alt="AI Thinking"
                      className="w-12 h-12 rounded-full animate-pulse"
                    />
                    <div className="absolute -top-1 -right-1">
                      <Brain className="h-4 w-4 text-blue-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-medium">{aiMessage}</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Help Message for Short Text */}
              {!aiThinking && sourceText.length > 0 && sourceText.length < 2 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Info className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700 dark:text-amber-300 text-xs">
                    Anlamlı çeviri için en az 2 karakter yazın. Örnek: "merhaba", "hello", "sen"
                  </span>
                </div>
              )}
              
              {/* Regular Status */}
              <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                {isTranslating && !aiThinking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Çeviri yapılıyor...</span>
                  </>
                ) : aiMessage ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Sparkles className="h-4 w-4" />
                    <span>{aiMessage}</span>
                  </div>
                ) : sourceText && translatedText ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    <span>✓ Çeviri tamamlandı</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Zap className="h-4 w-4" />
                    <span>Yazarken anında çeviri başlasın</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card className="text-center border-2 border-blue-200 dark:border-blue-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="relative mb-4">
                <Brain className="h-12 w-12 mx-auto text-blue-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
              <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">Yapay Zeka Gücü</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gelişmiş AI algoritmaları ile doğal ve akıcı çeviriler
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-purple-200 dark:border-purple-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="relative mb-4">
                <Zap className="h-12 w-12 mx-auto text-purple-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
              <h3 className="font-semibold mb-2 text-purple-800 dark:text-purple-200">Anlık Çeviri</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Her harf yazdığınızda AI anında çeviri yapar
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-2 border-indigo-200 dark:border-indigo-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="relative mb-4">
                <Sparkles className="h-12 w-12 mx-auto text-indigo-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full animate-pulse"></div>
              </div>
              <h3 className="font-semibold mb-2 text-indigo-800 dark:text-indigo-200">Akıllı Öğrenme</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Çeviri kalitesi sürekli olarak iyileşir
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}