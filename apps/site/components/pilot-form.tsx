'use client';

import { LoaderCircle, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const ACCEPTED_EXTENSIONS = ['.md', '.json', '.txt'];
const MAX_FILE_SIZE = 1_048_576;

export function PilotForm() {
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }
    const ext = selected.name.slice(selected.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setErrorMessage('File must be .md, .json, or .txt');
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setErrorMessage('File must be under 1 MB');
      setFile(null);
      return;
    }
    setErrorMessage('');
    setFile(selected);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please attach your audit report.');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('file', file);
    formData.append('notes', notes);
    formData.append('source', 'pilot-form');

    try {
      const res = await fetch('/api/pilot', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Submission failed');
      }
      setStatus('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-[rgba(45,212,168,0.2)] bg-[rgba(45,212,168,0.06)] px-7 py-8 text-center">
        <p className="text-base leading-7 text-[color:var(--text)]">
          Results received — I&apos;ll read them personally and follow up. Thank you.
        </p>
      </div>
    );
  }

  const disabled = status === 'submitting';

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div>
        <label className="mb-2 block text-sm font-medium text-[color:var(--text)]" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          type="email"
          required
          disabled={disabled}
          placeholder="you@company.com"
          className="rounded-lg border-[color:var(--border-bright)] bg-[color:var(--bg-card)] px-4 text-[color:var(--text-bright)]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[color:var(--text)]" htmlFor="file">
          Audit report (.md or .json)
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition',
            file
              ? 'border-[color:var(--accent)] bg-[rgba(45,212,168,0.06)] text-[color:var(--text)]'
              : 'border-[color:var(--border-bright)] bg-[color:var(--bg-card)] text-[color:var(--text-dim)] hover:border-[color:var(--text-dim)]',
          )}
        >
          <Upload className="size-4 shrink-0" />
          {file ? file.name : 'Choose file — .md, .json, or .txt (max 1 MB)'}
        </button>
        <input
          ref={fileInputRef}
          id="file"
          type="file"
          accept=".md,.json,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[color:var(--text)]" htmlFor="notes">
          Notes <span className="font-normal text-[color:var(--text-dim)]">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          disabled={disabled}
          placeholder="What workflow did you test? Anything feel off?"
          className="w-full rounded-lg border border-[color:var(--border-bright)] bg-[color:var(--bg-card)] px-4 py-3 text-sm text-[color:var(--text-bright)] outline-none ring-offset-[color:var(--bg)] placeholder:text-[color:var(--muted)] focus-visible:border-[color:var(--accent)] focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={disabled}
        className="rounded-lg px-6 font-mono text-sm"
      >
        {disabled ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Submit pilot results →
      </Button>

      {status === 'error' && errorMessage ? (
        <p className="text-sm text-[color:var(--warning)]">{errorMessage}</p>
      ) : null}
    </form>
  );
}
