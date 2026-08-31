import React, { useState, useEffect } from 'react'
import { X, CheckCircle2, RotateCw, BookOpen, Award, ArrowRight, Sparkles } from 'lucide-react'
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
      if (res.cards) {
        setCards(res.cards)
      }
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
        // Finished all
        setCurrentIndex(cards.length)
      }
    } catch (err) {
      console.error('Failed to record review:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="max-w-2xl w-full flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Active Recall & SRS Review (#review)</h2>
            <p className="text-xs text-synapse-muted">Modified Free Spaced Repetition Scheduler (FSRS)</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl text-synapse-muted hover:text-white hover:bg-synapse-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Flashcard Container */}
      <div className="max-w-2xl w-full frosted-glass rounded-2xl border border-synapse-border p-8 shadow-2xl flex flex-col min-h-[380px] justify-between relative overflow-hidden">
        {currentCard ? (
          <>
            {/* Progress Bar */}
            <div className="flex items-center justify-between text-xs text-synapse-muted mb-4 pb-2 border-b border-synapse-border/40">
              <span>Card {currentIndex + 1} of {cards.length}</span>
              <span className="font-mono text-emerald-400">Stability: {currentCard.stability}d | Diff: {currentCard.difficulty}</span>
            </div>

            {/* Question */}
            <div className="my-auto text-center py-4">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">Question</div>
              <h3 className="text-xl font-bold text-white leading-relaxed">{currentCard.question_text}</h3>
            </div>

            {/* Answer Section */}
            {isAnswerRevealed ? (
              <div className="mt-4 pt-4 border-t border-synapse-border/50 text-center animate-in fade-in duration-150">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Answer</div>
                <div className="text-lg font-semibold text-emerald-300 mb-6">{currentCard.answer_text}</div>

                {/* 4 FSRS Grade Buttons */}
                <div className="grid grid-cols-4 gap-2.5">
                  <button
                    onClick={() => handleGrade(1)}
                    className="py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all hover:scale-105"
                  >
                    <div>1 - Again</div>
                    <div className="text-[10px] font-normal opacity-75">&lt; 1 day</div>
                  </button>

                  <button
                    onClick={() => handleGrade(2)}
                    className="py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all hover:scale-105"
                  >
                    <div>2 - Hard</div>
                    <div className="text-[10px] font-normal opacity-75">~2 days</div>
                  </button>

                  <button
                    onClick={() => handleGrade(3)}
                    className="py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all hover:scale-105"
                  >
                    <div>3 - Good</div>
                    <div className="text-[10px] font-normal opacity-75">~4 days</div>
                  </button>

                  <button
                    onClick={() => handleGrade(4)}
                    className="py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-bold transition-all hover:scale-105"
                  >
                    <div>4 - Easy</div>
                    <div className="text-[10px] font-normal opacity-75">~8 days</div>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAnswerRevealed(true)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01]"
              >
                Show Answer (Space)
              </button>
            )}
          </>
        ) : (
          <div className="text-center my-auto py-8">
            <Award className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-white mb-2">All Reviews Complete!</h3>
            <p className="text-xs text-synapse-muted mb-6">
              You reviewed {completedCount} flashcards today. Retention weights have been updated in SQLite.
            </p>
            <button
              onClick={onClose}
              className="py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold shadow-lg transition-all"
            >
              Return to Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
