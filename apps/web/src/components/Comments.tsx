import { useCallback, useEffect, useState } from "react";
import type { Comment } from "@epkd/shared";
import { ErrorCode } from "@epkd/shared";
import { ApiClientError, apiDelete, apiGet, apiPost } from "../api/client";
import { SectionHead } from "./SectionHead";
import { StatusLine } from "./StatusLine";

const EMPTY_FORM = { nickname: "", password: "", body: "", website: "" };

const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.VALIDATION_FAILED]: "check your input and try again.",
  [ErrorCode.RATE_LIMITED]: "too many comments — try again in a minute.",
  [ErrorCode.POST_NOT_FOUND]: "this entry no longer exists.",
  [ErrorCode.FORBIDDEN]: "wrong password.",
};

function friendlyError(code: ErrorCode | null): string {
  return (code && ERROR_MESSAGES[code]) || "something went wrong. try again.";
}

function codeOf(e: unknown): ErrorCode | null {
  return e instanceof ApiClientError ? e.code : null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [listError, setListError] = useState<ErrorCode | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const refetch = useCallback(() => {
    apiGet<Comment[]>(`/api/posts/${slug}/comments`)
      .then((data) => {
        setComments(data);
        setListError(null);
      })
      .catch((e) => setListError(codeOf(e) ?? ErrorCode.INTERNAL));
  }, [slug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiPost(`/api/posts/${slug}/comments`, form);
      setForm(EMPTY_FORM);
      refetch();
    } catch (e) {
      setSubmitError(friendlyError(codeOf(e)));
    } finally {
      setSubmitting(false);
    }
  }

  function openDelete(id: number) {
    setDeletingId((current) => (current === id ? null : id));
    setDeletePassword("");
    setDeleteError(null);
  }

  function cancelDelete() {
    setDeletingId(null);
    setDeletePassword("");
    setDeleteError(null);
  }

  async function handleDelete(e: React.FormEvent, id: number) {
    e.preventDefault();
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiDelete(`/api/comments/${id}`, { password: deletePassword });
      cancelDelete();
      refetch();
    } catch (err) {
      const code = codeOf(err);
      setDeleteError(code === ErrorCode.FORBIDDEN ? "wrong password." : friendlyError(code));
    } finally {
      setDeleting(false);
    }
  }

  const count = comments?.length ?? 0;
  const countLabel = `${count} ${count === 1 ? "comment" : "comments"}`;

  return (
    <section className="section comments">
      <SectionHead title="Comments" aside={<span className="aside">{countLabel}</span>} />

      {listError && <StatusLine>failed to load comments.</StatusLine>}
      {comments && comments.length === 0 && <StatusLine>no comments yet — be the first.</StatusLine>}

      {comments && comments.length > 0 && (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <div className="comment-meta">
                <span className="comment-nickname">{c.nickname}</span>
                <span className="comment-date">{formatDate(c.createdAt)}</span>
                <button
                  type="button"
                  className="comment-delete"
                  aria-expanded={deletingId === c.id}
                  onClick={() => openDelete(c.id)}
                >
                  delete
                </button>
              </div>
              <p className="comment-body">{c.body}</p>
              {deletingId === c.id && (
                <form className="comment-delete-form" onSubmit={(e) => handleDelete(e, c.id)}>
                  <label className="sr-only" htmlFor={`delete-password-${c.id}`}>
                    password for this comment
                  </label>
                  <input
                    id={`delete-password-${c.id}`}
                    type="password"
                    placeholder="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={deleting || !deletePassword}>
                    {deleting ? "deleting…" : "confirm"}
                  </button>
                  <button type="button" className="comment-delete-cancel" onClick={cancelDelete}>
                    cancel
                  </button>
                  {deleteError && <span className="comment-delete-error">{deleteError}</span>}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="comment-form-head">leave a comment</div>
        <div className="comment-form-row">
          <label className="sr-only" htmlFor="comment-nickname">
            nickname
          </label>
          <input
            id="comment-nickname"
            type="text"
            placeholder="nickname"
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            maxLength={24}
            required
          />
          <label className="sr-only" htmlFor="comment-password">
            password
          </label>
          <input
            id="comment-password"
            type="password"
            placeholder="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={4}
            maxLength={72}
            required
          />
        </div>
        <label className="sr-only" htmlFor="comment-body">
          comment
        </label>
        <textarea
          id="comment-body"
          placeholder="write a comment…"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          maxLength={1000}
          required
        />
        <div style={{ display: "none" }} aria-hidden="true">
          <label>
            website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </label>
        </div>
        {submitError && <StatusLine>{submitError}</StatusLine>}
        <button type="submit" disabled={submitting}>
          {submitting ? "posting…" : "post comment"}
        </button>
        <p className="comment-privacy">
          Your nickname and comment are stored; the password is kept only as a hash for deletion. No email or IP is
          collected.
        </p>
      </form>
    </section>
  );
}
