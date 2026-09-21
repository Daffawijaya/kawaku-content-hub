import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { deleteComment, getAccountUsername, getMediaComments, postCommentReply, postMediaComment, setCommentHidden, type IgComment } from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/instagram/comments?ids=a,b: komentar asli IG per postingan.
// Maks 20 id; id yg gagal (mis. token tanpa instagram_manage_comments)
// dilaporkan di `errors` tanpa menggagalkan yg lain.
export async function GET(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  const self = await getAccountUsername();
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, comments: {}, self });
  }
  const comments: Record<string, IgComment[]> = {};
  const errors: Record<string, string> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        comments[id] = await getMediaComments(id);
      } catch (e) {
        errors[id] = e instanceof Error ? e.message : "Gagal membaca komentar.";
      }
    })
  );
  return NextResponse.json({ ok: true, comments, errors, self });
}

// POST { igMediaId, message, replyToCommentId? }: kirim komentar baru ke
// postingan (atas nama akun bisnis yg terhubung), atau balas komentar bila
// replyToCommentId diisi.
export async function POST(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as {
    igMediaId?: unknown;
    message?: unknown;
    replyToCommentId?: unknown;
  } | null;
  const igMediaId = typeof body?.igMediaId === "string" ? body.igMediaId.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const replyTo = typeof body?.replyToCommentId === "string" ? body.replyToCommentId.trim() : "";
  if (!igMediaId) {
    return NextResponse.json({ error: "igMediaId wajib diisi." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Komentar kosong." }, { status: 400 });
  }
  try {
    const id = replyTo ? await postCommentReply(replyTo, message) : await postMediaComment(igMediaId, message);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Posting komentar gagal." },
      { status: 500 }
    );
  }
}

// PATCH { commentId, action: "hide" | "unhide" | "delete" }: moderasi komentar.
export async function PATCH(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as {
    commentId?: unknown;
    action?: unknown;
  } | null;
  const commentId = typeof body?.commentId === "string" ? body.commentId.trim() : "";
  const action = typeof body?.action === "string" ? body.action.trim() : "";
  if (!commentId) {
    return NextResponse.json({ error: "commentId wajib diisi." }, { status: 400 });
  }
  try {
    if (action === "hide") await setCommentHidden(commentId, true);
    else if (action === "unhide") await setCommentHidden(commentId, false);
    else if (action === "delete") await deleteComment(commentId);
    else return NextResponse.json({ error: "action harus hide, unhide, atau delete." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Moderasi komentar gagal." },
      { status: 500 }
    );
  }
}
