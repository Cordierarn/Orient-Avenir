import { MessageCircle } from 'lucide-react'
import { forwardRef, useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert, Button, EmptyState, ErrorState, LoadingState } from '../../components'
import { errorMessage, messageRepo } from '../../db/repositories'
import { useAction, useRepo } from '../../hooks/useRepo'
import { formatHour } from '../../lib/dates'

interface ConversationProps {
  actorId: string
  otherId: string
  otherFirstName: string
  myFirstName: string
}

const dayLabel = (iso: string) => {
  const label = new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Messagerie persistante entre un lycéen et son conseiller, en ordre chronologique. */
export const Conversation = forwardRef<HTMLTextAreaElement, ConversationProps>(({ actorId, otherId, otherFirstName, myFirstName }, inputRef) => {
  const messages = useRepo(() => messageRepo.listMessages(actorId, otherId), [actorId, otherId])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.data?.length])

  const send = useAction(async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await messageRepo.sendMessage(actorId, otherId, draft)
      setDraft('')
    } catch (e) {
      setError(errorMessage(e, 'Le message n’a pas été envoyé. Votre texte est conservé : réessayez.'))
    }
  })

  if (messages.loading) return <LoadingState label="Chargement des messages…" />
  if (messages.error) return <ErrorState what="les messages" error={messages.error} />

  const list = messages.data ?? []
  let lastDay = ''

  return (
    <div className="stack">
      <div ref={listRef} className="chat" role="log" aria-label={`Messages avec ${otherFirstName}`} aria-live="polite" tabIndex={0}>
        {list.length ? (
          list.map((message) => {
            const day = message.sentAt.slice(0, 10)
            const showDay = day !== lastDay
            lastDay = day
            const mine = message.senderId === actorId
            return (
              <div key={message.id} className="stack-sm" style={{ gap: 8 }}>
                {showDay ? <p className="chat-day">{dayLabel(message.sentAt)}</p> : null}
                <div className={`bubble ${mine ? 'bubble-mine' : ''}`}>
                  <p className="bubble-meta">
                    {mine ? myFirstName : otherFirstName} · <time dateTime={message.sentAt}>{formatHour(message.sentAt)}</time>
                  </p>
                  <p>{message.body}</p>
                </div>
              </div>
            )
          })
        ) : (
          <EmptyState icon={<MessageCircle size={20} />} title="Aucun message pour l’instant">
            Présentez-vous ou posez votre première question : {otherFirstName} la verra dans son espace.
          </EmptyState>
        )}
      </div>
      {error ? <Alert tone="error" role="alert" title="Message non envoyé">{error}</Alert> : null}
      <form className="cluster" style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }} onSubmit={(e) => void send.run(e)}>
        <label htmlFor={`message-${otherId}`} className="visually-hidden">
          Écrire un message à {otherFirstName}
        </label>
        <textarea
          ref={inputRef}
          id={`message-${otherId}`}
          className="textarea"
          rows={1}
          style={{ minHeight: 44 }}
          placeholder="Écrire un message…"
          value={draft}
          maxLength={messageRepo.MESSAGE_MAX_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <Button type="submit" loading={send.pending} disabled={!draft.trim()}>
          Envoyer
        </Button>
      </form>
    </div>
  )
})

Conversation.displayName = 'Conversation'
