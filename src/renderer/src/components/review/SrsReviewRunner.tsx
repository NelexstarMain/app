import React, { useState, useEffect } from 'react'
import { X, BookOpen, Award } from 'lucide-react'
import { SrsCardRecord } from '../../../../shared/types/database'
import { ReviewGrade } from '../../../../shared/types/fsrs'
import { IpcChannel } from '../../../../shared/ipc/channels'

interface Props {
  isOpen: boolean
  onClose: () => void
  onReviewRecorded: (cardId: string, grade: ReviewGrade, latencyMs: number) => void
}

export const SrsReviewRunner: React.FC<Props> = ({ isOpen, onClose, onReviewRecorded }) => {
  const [cards, setCards] = useState<SrsCardRecord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    if (isOpen) {
      loadDueCards()
      setCurrentIndex(0)
      setIsAnswerRevealed(false)
      setCompletedCount(0)
      setStartTime(Date.now())
    }
  }, [isOpen])

  const loadDueCards = async () => {
    try {
      const res = await window.electronAPI.invoke(IpcChannel.DB_GET_SRS_DUE, { limit: 50 })
      if (res.cards) setCards(res.cards)
    } catch (err) {
      console.error('Failed to fetch due SRS cards:', err)
    }
  }

  if (!isOpen) return null

  const currentCard = cards[currentIndex]

  const handleGrade = async (grade: ReviewGrade) => {
    if (!currentCard) return
    const latency = Date.now() - startTime

    try {
      await window.electronAPI.invoke(IpcChannel.DB_RECORD_SRS_REVIEW, {
        cardId: currentCard.card_id,
        grade,
        latencyMs: latency
      })
      onReviewRecorded(currentCard.card_id, grade, latency)
      setCompletedCount((c) => c + 1)

      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((i) => i + 1)
        setIsAnswerRevealed(false)
        setStartTime(Date.now())
      } else {
        setCurrentIndex(cards.length)
      }
    } catch (err) {
      console.error('Failed to record review:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 select-none text-xs">
      <div className="max-w-xl w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#8C6D37]" />
          <span className="font-semibold text-[#D8DAE0]">Powtórki FSRS (#review)</span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-[#727683] hover:text-[#D8DAE0]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-xl w-full rounded-xl bg-[#141519] border border-[#282932] p-6 shadow-2xl flex flex-col min-h-[320px] justify-between">
        {currentCard ? (
          <>
            <div className="flex items-center justify-between text-[11px] text-[#727683] pb-2 border-b border-[#22242b]">
              <span>Karta {currentIndex + 1} z {cards.length}</span>
              <span className="font-mono">S: {currentCard.stability}d | D: {currentCard.difficulty}</span>
            </div>

            <div className="my-auto text-center py-6">
              <div className="text-[10px] font-semibold text-[#8C6D37] uppercase tracking-wider mb-2">Pytanie</div>
              <h3 className="text-base font-semibold text-[#D8DAE0] leading-relaxed">{currentCard.question_text}</h3>
            </div>

            {isAnswerRevealed ? (
              <div className="pt-3 border-t border-[#22242b] text-center">
                <div className="text-[10px] font-semibold text-[#38664B] uppercase tracking-wider mb-1">Odpowiedź</div>
                <div className="text-sm font-medium text-[#D8DAE0] mb-4">{currentCard.answer_text}</div>

                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleGrade(1)}
                    className="py-2 rounded-lg bg-[#1b1c22] hover:bg-[#7A3E48]/30 border border-[#282932] text-[#D8DAE0] text-[11px] transition-colors"
                  >
                    1 - Again
                  </button>
                  <button
                    onClick={() => handleGrade(2)}
                    className="py-2 rounded-lg bg-[#1b1c22] hover:bg-[#8C6D37]/30 border border-[#282932] text-[#D8DAE0] text-[11px] transition-colors"
                  >
                    2 - Hard
                  </button>
                  <button
                    onClick={() => handleGrade(3)}
                    className="py-2 rounded-lg bg-[#1b1c22] hover:bg-[#38664B]/30 border border-[#282932] text-[#D8DAE0] text-[11px] transition-colors"
                  >
                    3 - Good
                  </button>
                  <button
                    onClick={() => handleGrade(4)}
                    className="py-2 rounded-lg bg-[#1b1c22] hover:bg-[#4A6B8A]/30 border border-[#282932] text-[#D8DAE0] text-[11px] transition-colors"
                  >
                    4 - Easy
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAnswerRevealed(true)}
                className="w-full py-2.5 rounded-lg bg-[#1b1c22] hover:bg-[#22242b] text-[#D8DAE0] font-medium text-xs border border-[#282932] transition-colors"
              >
                Pokaż Odpowiedź (Spacja)
              </button>
            )}
          </>
        ) : (
          <div className="text-center my-auto py-6">
            <Award className="w-10 h-10 text-[#38664B] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#D8DAE0] mb-1">Wszystkie powtórki ukończone!</h3>
            <p className="text-[11px] text-[#727683] mb-4">Przerobiono {completedCount} kart dzisiaj.</p>
            <button
              onClick={onClose}
              className="py-1.5 px-4 rounded-lg bg-[#1b1c22] text-[#D8DAE0] text-xs border border-[#282932]"
            >
              Powrót do tablicy
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
