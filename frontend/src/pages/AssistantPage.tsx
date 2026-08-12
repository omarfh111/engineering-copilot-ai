import { AlertTriangle, Bot, FileText, Loader2, SendHorizontal, Sparkles, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getApiErrorMessage } from '../lib/api';
import { assistantService } from '../services/assistantService';
import type { AssistantAnswer, AssistantSource } from '../types/assistant';

const MIN_QUESTION_LENGTH = 3;

const EXAMPLE_QUESTIONS = [
  'Quelles sont les bonnes pratiques de Spring Boot ?',
  'Quelles protections recommande OWASP pour les API ?',
  'Comment appliquer les principes de la Clean Architecture ?'
];

type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; answer: AssistantAnswer }
  | { id: string; role: 'error'; text: string };

let messageCounter = 0;
function nextId(prefix: string) {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

function confidenceTone(confidence: number) {
  if (confidence >= 0.8) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }
  if (confidence >= 0.5) {
    return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
  }
  return 'bg-rose-500/15 text-rose-200 border-rose-500/30';
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) {
    return null;
  }
  const percent = Math.round(confidence * 100);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${confidenceTone(confidence)}`}>
      Confidence {percent}%
    </span>
  );
}

function SourceList({ sources }: { sources: AssistantSource[] }) {
  if (sources.length === 0) {
    return null;
  }
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">Sources</p>
      <ul className="space-y-2">
        {sources.map((source, index) => (
          <li
            key={source.chunkId ?? `${source.source ?? 'source'}-${index}`}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-300"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-100">
                {source.displayName ?? source.source ?? 'Source inconnue'}
              </span>
              <span className="text-xs text-slate-400">
                {source.pageNumber !== null ? `Page ${source.pageNumber}` : 'Page inconnue'}
                {source.score !== null ? ` · score ${source.score.toFixed(2)}` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssistantBubble({ answer }: { answer: AssistantAnswer }) {
  const lowConfidence = answer.confidence !== null && answer.confidence < 0.5;

  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-200">
        <Bot className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ConfidenceBadge confidence={answer.confidence} />
          {answer.chunksUsed !== null ? (
            <span className="text-xs text-slate-400">{answer.chunksUsed} chunks</span>
          ) : null}
          {answer.responseTimeMs !== null ? (
            <span className="text-xs text-slate-400">· {answer.responseTimeMs} ms</span>
          ) : null}
          {answer.framework ? <span className="text-xs text-slate-400">· {answer.framework}</span> : null}
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{answer.answer}</p>

        {lowConfidence ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Low confidence: this answer may be incomplete. Verify against the cited sources.
          </p>
        ) : null}

        <SourceList sources={answer.sources} />
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[80%] rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm text-brand-50">
        {text}
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-slate-300">
        <User className="h-5 w-5" />
      </div>
    </div>
  );
}

function ErrorBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{text}</div>
    </div>
  );
}

export function AssistantPage() {
  const { currentUser } = useSession();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiHealthy, setAiHealthy] = useState<boolean | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    assistantService
      .getHealth()
      .then((health) => {
        if (active) {
          setAiHealthy(health.aiService);
        }
      })
      .catch(() => {
        if (active) {
          setAiHealthy(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const submitQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();

    if (question.length < MIN_QUESTION_LENGTH) {
      showToast({
        type: 'error',
        title: 'Question too short',
        description: `Enter at least ${MIN_QUESTION_LENGTH} characters.`
      });
      return;
    }

    if (loading) {
      return;
    }

    setMessages((current) => [...current, { id: nextId('user'), role: 'user', text: question }]);
    setInput('');
    setLoading(true);

    try {
      const answer = await assistantService.ask({ question });
      setMessages((current) => [...current, { id: nextId('assistant'), role: 'assistant', answer }]);
    } catch (error) {
      const description = getApiErrorMessage(error);
      setMessages((current) => [...current, { id: nextId('error'), role: 'error', text: description }]);
      showToast({ type: 'error', title: 'The assistant could not answer', description });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion(input);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="page-shell border-white/10 bg-slate-950/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">AI assistant</p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
              <Sparkles className="h-6 w-6 text-brand-300" />
              Engineering Copilot
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Ask a software-engineering question. Answers are generated from the shared technical corpus
              (architecture, clean code, security, framework docs) and always come with their sources.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-xs font-semibold ${
              aiHealthy === null
                ? 'border-white/10 bg-white/5 text-slate-300'
                : aiHealthy
                  ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/15 text-rose-200'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                aiHealthy === null ? 'bg-slate-400' : aiHealthy ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            {aiHealthy === null ? 'Checking AI service…' : aiHealthy ? 'AI service online' : 'AI service unavailable'}
          </span>
        </div>
      </section>

      <section className="page-shell flex min-h-[420px] flex-1 flex-col border-white/10 bg-slate-950/40">
        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-200">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Hi{currentUser ? ` ${currentUser.firstName}` : ''}, how can I help?
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-400">Try one of these questions to get started.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUESTIONS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => void submitQuestion(example)}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200 transition hover:border-brand-400/40 hover:text-brand-100"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              if (message.role === 'user') {
                return <UserBubble key={message.id} text={message.text} />;
              }
              if (message.role === 'assistant') {
                return <AssistantBubble key={message.id} answer={message.answer} />;
              }
              return <ErrorBubble key={message.id} text={message.text} />;
            })
          )}

          {loading ? (
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-200">
                <Bot className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                The assistant is thinking…
              </span>
            </div>
          ) : null}

          <div ref={threadEndRef} />
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-end gap-3">
            <textarea
              className="min-h-[52px] max-h-40 flex-1 resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-brand-400/40"
              placeholder="Ask a software-engineering question… (Enter to send, Shift+Enter for a new line)"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => void submitQuestion(input)}
              disabled={loading || input.trim().length < MIN_QUESTION_LENGTH}
              className="inline-flex h-[52px] items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 text-sm font-semibold text-white transition hover:from-brand-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              Send
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            The assistant answers from indexed documentation only. Verify critical decisions against the cited sources.
          </p>
        </div>
      </section>
    </div>
  );
}
