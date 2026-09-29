"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { calculatePrice, isLateNightTime, RULE_KEYS, type PriceMaster } from "@/lib/pricing";
import { reservationSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { MEETING_METHODS, PAYMENT_METHODS, PLACES } from "@/lib/constants";
import { displayTimeOption, formatDateShort } from "@/lib/time";
import { yen } from "@/lib/format";
import { cn } from "@/lib/cn";
import { submitReservation } from "@/lib/actions/reservation";
import { PriceBreakdown } from "@/components/price/PriceBreakdown";
import { Icon } from "@/components/ui/Icon";

type TherapistOpt = { slug: string; name: string; canOvernight: boolean };
type Initial = {
  therapist: string;
  secondTherapist: string;
  repeat: boolean;
  course: string;
  ext: number;
  area: string;
  date: string;
  time: string;
  options: string[];
  campaign: string;
};
type Slot = { id: string; time24: string; label: string; status: string };

const empty = {
  customerName: "",
  phone: "",
  email: "",
  nearestStation: "",
  meetingMethod: "",
  place: "",
  paymentMethod: "",
  note: "",
  agree: false,
};

/**
 * 予約フォーム: 入力 → 確認 → 送信 の3ステップ。
 * 料金シミュレーターやプロフィールの空き枠から渡された条件を初期値として反映する。
 */
export function ReservationForm({
  master,
  therapists,
  initial,
  dates,
  times,
  formToken,
  notice,
}: {
  master: PriceMaster;
  therapists: TherapistOpt[];
  initial: Initial;
  dates: string[];
  times: string[];
  formToken: string;
  notice: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");
  const [f, setF] = useState({
    ...empty,
    date: initial.date,
    time: initial.time,
    therapist: initial.therapist,
    secondTherapist: initial.secondTherapist,
    isRepeat: initial.repeat ? "1" : initial.therapist ? "" : "0",
    courseId: initial.course,
    extensionCount: initial.ext,
    areaId: initial.area,
    optionIds: initial.options,
    campaignId: initial.campaign,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }));
  };
  const topRef = useRef<HTMLDivElement>(null);

  // 選択中のセラピスト・日付の空き枠を取得
  const [slots, setSlots] = useState<{ key: string; label: string | null; slots: Slot[] } | null>(null);
  useEffect(() => {
    if (!f.therapist || !f.date) return;
    const key = `${f.therapist}:${f.date}`;
    let alive = true;
    fetch(`/api/availability?therapist=${encodeURIComponent(f.therapist)}&date=${f.date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setSlots({ key, label: d?.schedule?.label ?? null, slots: d?.schedule?.slots ?? [] }))
      .catch(() => alive && setSlots({ key, label: null, slots: [] }));
    return () => {
      alive = false;
    };
  }, [f.therapist, f.date]);
  const currentSlots = slots && slots.key === `${f.therapist}:${f.date}` ? slots : null;

  const therapist = master.therapists.find((t) => t.slug === f.therapist);
  const lateNight = isLateNightTime(f.time, master.rules);
  const price = useMemo(
    () =>
      calculatePrice(
        {
          therapistId: therapist?.id ?? null,
          isRepeat: f.isRepeat === "1",
          courseId: f.courseId,
          extensionCount: f.extensionCount,
          areaId: f.areaId,
          lateNight,
          optionIds: f.optionIds,
          campaignId: f.campaignId || null,
        },
        master,
      ),
    [f, therapist, lateNight, master],
  );
  const course = master.courses.find((c) => c.id === f.courseId);
  const selectedT = therapists.find((t) => t.slug === f.therapist);

  const payload = () => ({ ...f, lateNight, extensionCount: Number(f.extensionCount) });

  const toConfirm = () => {
    const r = reservationSchema.safeParse(payload());
    if (!r.success) {
      const errs = toFieldErrors(r.error);
      setErrors(errs);
      setMessage("入力内容をご確認ください");
      requestAnimationFrame(() => document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    setErrors({});
    setMessage("");
    setStep("confirm");
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const submit = () => {
    startTransition(async () => {
      const res = await submitReservation(payload(), formToken, hp);
      if (res.ok) {
        router.push(`/reserve/complete?no=${res.reservationNo}&t=${res.token}`);
        return;
      }
      setMessage(res.message);
      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        setStep("input");
      }
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  const extUnit = master.rules[RULE_KEYS.extensionUnit] ?? 30;

  return (
    <div ref={topRef} className="scroll-mt-24">
      <ol className="mb-6 flex items-center gap-2 text-xs" aria-label="進捗">
        {["入力", "確認", "完了"].map((s, i) => {
          const active = (step === "input" && i === 0) || (step === "confirm" && i === 1);
          return (
            <li key={s} className="flex items-center gap-2">
              <span className={cn("flex h-7 items-center rounded-full px-3", active ? "bg-ink text-ivory" : "bg-white text-muted ring-1 ring-line")} aria-current={active ? "step" : undefined}>
                {i + 1}. {s}
              </span>
              {i < 2 && <span className="h-px w-4 bg-line" />}
            </li>
          );
        })}
      </ol>

      {message && (
        <div role="alert" className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {message}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {step === "input" ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              toConfirm();
            }}
            className="space-y-10"
          >
            <p className="rounded-xl bg-white px-4 py-3 text-sm text-ink-soft ring-1 ring-line">{notice}</p>
            {/* ハニーポット (人には見えない) */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
              </label>
            </div>

            <Section title="ご希望の日時・セラピスト">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="希望日" required error={errors.date}>
                  <select value={f.date} onChange={(e) => set("date", e.target.value)} className="field">
                    <option value="">選択してください</option>
                    {dates.map((d, i) => (
                      <option key={d} value={d}>
                        {formatDateShort(d)}
                        {i === 0 ? "（本日）" : i === 1 ? "（明日）" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="希望開始時間" required error={errors.time}>
                  <select value={f.time} onChange={(e) => set("time", e.target.value)} className="field">
                    <option value="">選択してください</option>
                    {times.map((t) => (
                      <option key={t} value={t}>
                        {displayTimeOption(t)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="セラピスト（第一希望）" error={errors.therapist}>
                  <select value={f.therapist} onChange={(e) => set("therapist", e.target.value)} className="field">
                    <option value="">指名なし（おまかせ）</option>
                    {therapists.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="セラピスト（第二希望）" error={errors.secondTherapist}>
                  <select value={f.secondTherapist} onChange={(e) => set("secondTherapist", e.target.value)} className="field">
                    <option value="">なし</option>
                    {therapists
                      .filter((t) => t.slug !== f.therapist)
                      .map((t) => (
                        <option key={t.slug} value={t.slug}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </div>
              {f.therapist && f.date && (
                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-line">
                  <p className="text-sm">
                    <span className="font-medium">{selectedT?.name}</span> の {formatDateShort(f.date)} の空き状況
                    {currentSlots?.label && <span className="ml-2 text-xs text-muted">出勤 {currentSlots.label}</span>}
                  </p>
                  {!currentSlots ? (
                    <p className="mt-2 text-xs text-muted">確認中…</p>
                  ) : currentSlots.slots.length === 0 ? (
                    <p className="mt-2 text-xs text-warn">この日は出勤予定がありません（または未定です）。別の日付をお選びいただくか、備考欄にご相談内容をご記入ください。</p>
                  ) : (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {currentSlots.slots.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            disabled={s.status !== "AVAILABLE"}
                            onClick={() => set("time", s.time24)}
                            className={cn(
                              "rounded-full px-3 py-1.5 text-xs ring-1",
                              s.status === "AVAILABLE" ? (f.time === s.time24 ? "bg-ok text-white ring-ok" : "bg-ok-soft text-ok ring-ok/30 hover:ring-ok") : "bg-ng-soft text-ng ring-transparent line-through",
                            )}
                          >
                            {s.label}〜{s.status === "INQUIRY" ? "（要問合せ）" : ""}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Section>

            <Section title="コース・オプション">
              <Field label="コース" required error={errors.courseId}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {master.courses.map((c) => (
                    <label key={c.id} className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3", f.courseId === c.id ? "border-ink ring-1 ring-ink" : "border-line")}>
                      <span className="flex items-center gap-3 text-sm">
                        <input type="radio" name="course" checked={f.courseId === c.id} onChange={() => set("courseId", c.id)} className="accent-ink" />
                        {c.name}
                      </span>
                      <span className="text-sm tabular-nums">{yen(c.price)}</span>
                    </label>
                  ))}
                </div>
                {course?.isOvernight && selectedT && !selectedT.canOvernight && <p className="mt-2 text-xs text-danger">{selectedT.name}はお泊まりコースに対応していません。</p>}
              </Field>
              {course && !course.isOvernight && (
                <Field label="延長">
                  <select value={f.extensionCount} onChange={(e) => set("extensionCount", Number(e.target.value))} className="field sm:w-60">
                    {Array.from({ length: 7 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? "なし" : `${i * extUnit}分`}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {master.options.length > 0 && (
                <Field label="オプション">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {master.options.map((o) => {
                      const on = f.optionIds.includes(o.id);
                      return (
                        <label key={o.id} className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-sm", on ? "border-ink" : "border-line")}>
                          <span className="flex items-center gap-3">
                            <input type="checkbox" checked={on} onChange={() => set("optionIds", on ? f.optionIds.filter((x) => x !== o.id) : [...f.optionIds, o.id])} className="h-4 w-4 accent-ink" />
                            {o.name}
                          </span>
                          <span className="tabular-nums">+{yen(o.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </Field>
              )}
              {master.campaigns.length > 0 && (
                <Field label="キャンペーン">
                  <select value={f.campaignId} onChange={(e) => set("campaignId", e.target.value)} className="field">
                    <option value="">利用しない</option>
                    {master.campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </Section>

            <Section title="待ち合わせ・ご利用場所">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ご利用エリア" required error={errors.areaId}>
                  <select value={f.areaId} onChange={(e) => set("areaId", e.target.value)} className="field">
                    <option value="">選択してください</option>
                    {master.areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="最寄駅" error={errors.nearestStation}>
                  <input value={f.nearestStation} onChange={(e) => set("nearestStation", e.target.value)} maxLength={60} className="field" placeholder="例：新宿駅" />
                </Field>
                <Field label="合流方法" required error={errors.meetingMethod}>
                  <select value={f.meetingMethod} onChange={(e) => set("meetingMethod", e.target.value)} className="field">
                    <option value="">選択してください</option>
                    {MEETING_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="ご利用場所" required error={errors.place}>
                  <select value={f.place} onChange={(e) => set("place", e.target.value)} className="field">
                    <option value="">選択してください</option>
                    {PLACES.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="お客様情報">
              <Field label="ご利用は初めてですか？" required error={errors.isRepeat}>
                <div className="grid grid-cols-2 gap-2" role="radiogroup">
                  {[
                    ["0", "初めて"],
                    ["1", "リピート"],
                  ].map(([v, l]) => (
                    <button key={v} type="button" role="radio" aria-checked={f.isRepeat === v} onClick={() => set("isRepeat", v)} className={cn("chip h-11 justify-center text-sm", f.isRepeat === v && "chip-active")}>
                      {l}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="お名前（ニックネーム可）" required error={errors.customerName}>
                  <input value={f.customerName} onChange={(e) => set("customerName", e.target.value)} maxLength={40} autoComplete="nickname" className="field" />
                </Field>
                <Field label="電話番号" required error={errors.phone}>
                  <input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} className="field" placeholder="090-1234-5678" />
                </Field>
                <Field label="メールアドレス" required error={errors.email}>
                  <input value={f.email} onChange={(e) => set("email", e.target.value)} type="email" inputMode="email" autoComplete="email" maxLength={254} className="field" />
                </Field>
                <Field label="お支払い方法" required error={errors.paymentMethod}>
                  <select value={f.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} className="field">
                    <option value="">選択してください</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="備考・ご要望" error={errors.note}>
                <textarea value={f.note} onChange={(e) => set("note", e.target.value)} rows={4} maxLength={1000} className="field" placeholder="初めてで緊張している、など何でもお書きください" />
              </Field>
              <div data-error={!!errors.agree} className="rounded-xl bg-white p-4 ring-1 ring-line">
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={f.agree} onChange={(e) => set("agree", e.target.checked)} className="mt-0.5 h-5 w-5 accent-ink" />
                  <span>
                    <Link href="/terms" target="_blank" className="text-gold-deep underline">利用規約</Link>・
                    <Link href="/p/cancel-policy" target="_blank" className="text-gold-deep underline">キャンセルポリシー</Link>・
                    <Link href="/privacy" target="_blank" className="text-gold-deep underline">プライバシーポリシー</Link>に同意します
                  </span>
                </label>
                {errors.agree && <p className="mt-2 text-xs text-danger">{errors.agree}</p>}
              </div>
            </Section>

            <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-ink text-ivory tracking-wider hover:bg-ink-soft">
              入力内容を確認する
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="card p-5 sm:p-6">
              <h2 className="text-lg">入力内容の確認</h2>
              <dl className="mt-4 divide-y divide-line text-sm">
                {[
                  ["希望日時", `${formatDateShort(f.date)} ${displayTimeOption(f.time)}〜`],
                  ["セラピスト", `${selectedT?.name ?? "指名なし（おまかせ）"}${f.secondTherapist ? ` ／ 第二希望：${therapists.find((t) => t.slug === f.secondTherapist)?.name}` : ""}`],
                  ["ご利用", f.isRepeat === "1" ? "リピート" : "初めて"],
                  ["コース", `${course?.name ?? ""}${f.extensionCount ? `（延長 ${f.extensionCount * extUnit}分）` : ""}`],
                  ["オプション", f.optionIds.map((id) => master.options.find((o) => o.id === id)?.name).join("、") || "なし"],
                  ["キャンペーン", master.campaigns.find((c) => c.id === f.campaignId)?.name ?? "なし"],
                  ["エリア", `${master.areas.find((a) => a.id === f.areaId)?.name ?? ""}${f.nearestStation ? `（${f.nearestStation}）` : ""}`],
                  ["合流方法", f.meetingMethod],
                  ["ご利用場所", f.place],
                  ["お名前", f.customerName],
                  ["電話番号", f.phone],
                  ["メール", f.email],
                  ["お支払い方法", f.paymentMethod],
                  ["備考", f.note || "なし"],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[7rem_1fr] gap-3 py-2.5">
                    <dt className="text-muted">{k}</dt>
                    <dd className="break-words whitespace-pre-line">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <button type="button" onClick={() => setStep("input")} disabled={pending} className="h-14 rounded-full border border-line bg-white text-sm">
                修正する
              </button>
              <button type="button" onClick={submit} disabled={pending} className="flex h-14 items-center justify-center gap-2 rounded-full bg-gold text-white tracking-wider hover:bg-gold-deep disabled:opacity-60">
                {pending ? "送信中…" : "この内容で予約をリクエスト"}
              </button>
            </div>
            <p className="text-center text-xs text-muted">送信後に受付番号が発行されます。確定はスタッフからのご連絡をもって完了します。</p>
          </div>
        )}

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="font-display text-[11px] tracking-[0.3em] text-gold">ESTIMATE</p>
            <h2 className="mb-3 text-base">お見積り</h2>
            <PriceBreakdown result={price} />
            {lateNight && <p className="mt-2 text-xs text-muted">※ 開始時間が深夜料金の対象時間帯です</p>}
            <p className="mt-3 text-[11px] text-muted">※ 表示金額は目安です。確定金額はスタッフよりご案内します。</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 w-full border-b border-line pb-2 font-serif text-lg">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div data-error={!!error}>
      <span className="field-label">
        {label}
        {required && <span className="ml-1.5 rounded bg-rose-soft px-1.5 py-0.5 text-[10px] text-rose">必須</span>}
      </span>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
