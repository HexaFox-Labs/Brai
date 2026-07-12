"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Download, Trash2, X } from "lucide-react";
import {
  deleteBraiCmdAudio,
  downloadBraiCmdAudio,
  getBraiCmdSettings,
  openBraiCmdPermission,
  saveBraiCmdProvider,
  testBraiCmdConnection,
  testBraiCmdProvider,
  updateBraiCmdSettings,
  type BraiCmdAudioItem,
  type BraiCmdContextActions,
  type BraiCmdPermissionKey,
  type BraiCmdProviderId,
  type BraiCmdProviderMode,
  type BraiCmdProviderTestResult,
  type BraiCmdSettingsPatch,
  type BraiCmdSnapshot,
} from "@/shared/platform/braiCmd";
import { installAndroidBackHandler } from "@/shared/platform/platform";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { SECTION_GRID_CLASS } from "../../appModel";
import { cx } from "../../appUtils";

const PROVIDERS: Array<{ id: BraiCmdProviderId; label: string; baseUrl?: string }> = [
  { id: "openai", label: "OpenAI" },
  { id: "groq", label: "Groq" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "gemini", label: "Gemini" },
  { id: "custom-openai", label: "OpenAI-compatible" },
];

const PERMISSIONS: Array<{ id: BraiCmdPermissionKey; title: string; text: string }> = [
  { id: "accessibility", title: "Специальные возможности", text: "Чтение контекста и вставка текста." },
  { id: "overlay", title: "Поверх приложений", text: "Плавающие кнопки Brai CMD." },
  { id: "microphone", title: "Микрофон", text: "Запись голосовых команд." },
  { id: "notifications", title: "Уведомления", text: "Статус записи и отправки." },
];

const CONTEXT_ACTIONS: Array<{ id: keyof BraiCmdContextActions; title: string; text: string }> = [
  { id: "voiceCommand", title: "Команда голосом", text: "Отправить голосовое во Входящие" },
  { id: "screenshotInbox", title: "Скриншот во Входящие", text: "Текущий экран во входящие" },
  { id: "screenshotVoice", title: "Скриншот + голос", text: "Скриншот вместе с голосовой командой" },
  { id: "contextInbox", title: "Контекст во Входящие", text: "Структурный текст со страницы во Входящие" },
  { id: "contextReply", title: "Ответ с контекстом", text: "Подготовить ответ и вставить в поле ввода" },
];

type CmdPage = "main" | "provider" | "audio";

export function BraiCmdSection() {
  const [snapshot, setSnapshot] = useState<BraiCmdSnapshot | null>(null);
  const [page, setPage] = useState<CmdPage>("main");
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState("Протестируйте подключение");

  useEffect(() => {
    let active = true;
    void getBraiCmdSettings().then((next) => {
      if (!active) return;
      setSnapshot(next);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => installAndroidBackHandler(() => {
    if (page === "main") return false;
    setPage("main");
    return true;
  }), [page]);

  async function patchSettings(patch: BraiCmdSettingsPatch) {
    const next = await updateBraiCmdSettings(patch);
    if (next) setSnapshot(next);
  }

  async function testConnection() {
    setConnection("Проверка...");
    const result = await testBraiCmdConnection();
    setConnection(result?.ok ? "Всё работает" : "Подключение не работает");
  }

  if (loading) {
    return <section className={cx(SECTION_GRID_CLASS, "max-w-3xl content-start")} aria-label="Brai CMD"><Card className="p-5 text-sm text-muted-foreground">Загрузка</Card></section>;
  }

  if (!snapshot) {
    return (
      <section className={cx(SECTION_GRID_CLASS, "max-w-3xl content-start")} aria-label="Brai CMD">
        <h1 className="text-2xl font-semibold">Brai CMD</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Android</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Настройки Brai CMD доступны в Android-приложении Brai.</CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className={cx(SECTION_GRID_CLASS, "max-w-3xl content-start pb-8")} aria-label="Brai CMD">
      {page === "main" ? (
        <MainPage
          snapshot={snapshot}
          connection={connection}
          onConnectionTest={() => void testConnection()}
          onPermission={(permission) => void openBraiCmdPermission(permission).then((next) => { if (next) setSnapshot(next); })}
          onPatch={(patch) => void patchSettings(patch)}
          onProvider={() => setPage("provider")}
          onAudio={() => setPage("audio")}
        />
      ) : page === "provider" ? (
        <ProviderPage snapshot={snapshot} onBack={() => setPage("main")} onSnapshot={setSnapshot} />
      ) : (
        <AudioPage snapshot={snapshot} onBack={() => setPage("main")} onPatch={(patch) => void patchSettings(patch)} onSnapshot={setSnapshot} />
      )}
    </section>
  );
}

function MainPage({
  snapshot,
  connection,
  onConnectionTest,
  onPermission,
  onPatch,
  onProvider,
  onAudio,
}: {
  snapshot: BraiCmdSnapshot;
  connection: string;
  onConnectionTest: () => void;
  onPermission: (permission: BraiCmdPermissionKey) => void;
  onPatch: (patch: BraiCmdSettingsPatch) => void;
  onProvider: () => void;
  onAudio: () => void;
}) {
  const { settings } = snapshot;
  return (
    <>
      <h1 className="text-2xl font-semibold">Brai CMD</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Разрешения</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {PERMISSIONS.map((permission) => {
            const granted = snapshot.permissions[permission.id];
            return (
              <div key={permission.id} className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
                <div className="min-w-0">
                  <div className="font-medium">{permission.title}</div>
                  <div className="text-sm text-muted-foreground">{permission.text}</div>
                </div>
                <Button type="button" variant={granted ? "secondary" : "default"} disabled={granted} onClick={() => onPermission(permission.id)}>
                  {granted ? "Выдано" : "Разрешить"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Проверка связи</CardTitle>
          <CardAction><Button type="button" onClick={onConnectionTest}>Тест</Button></CardAction>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{connection}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Кнопки контекста</CardTitle>
          <CardDescription>Вы можете включать и выключать набор кнопок</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {CONTEXT_ACTIONS.map((action) => (
            <SwitchRow
              key={action.id}
              title={action.title}
              text={action.text}
              checked={settings.contextActions[action.id]}
              onCheckedChange={(checked) => onPatch({ contextActions: { [action.id]: checked } as Partial<BraiCmdContextActions> })}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Настройки кнопок</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <RangeRow title="Основная иконка: непрозрачность" value={settings.mainIconOpacityPercent} min={35} max={100} onChange={(value) => onPatch({ mainIconOpacityPercent: value })} />
          <RangeRow title="Основная иконка: размер" value={settings.mainIconSizePercent} min={70} max={130} onChange={(value) => onPatch({ mainIconSizePercent: value })} />
          <Separator />
          <RangeRow title="Контекст: непрозрачность" value={settings.contextIconOpacityPercent} min={35} max={100} onChange={(value) => onPatch({ contextIconOpacityPercent: value })} />
          <RangeRow title="Контекст: размер" value={settings.contextIconSizePercent} min={70} max={130} onChange={(value) => onPatch({ contextIconSizePercent: value })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Постобработка</CardTitle>
          <CardDescription>Улучшаем с ИИ текст полученный после расшифровки.</CardDescription>
          <CardAction><Switch checked={settings.postProcessingEnabled} onCheckedChange={(checked) => onPatch({ postProcessingEnabled: checked })} /></CardAction>
        </CardHeader>
        {settings.postProcessingEnabled ? (
          <CardContent className="grid gap-3">
            <Button type="button" variant="outline" className="justify-self-start" onClick={onProvider}>
              {settings.providerConfigured ? <Check /> : <X className="text-destructive" />}
              Поставщик LLM
            </Button>
            <Textarea
              value={settings.postProcessingPrompt}
              rows={6}
              onChange={(event) => onPatch({ postProcessingPrompt: event.target.value })}
            />
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Статистика Транскриптов</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsGrid snapshot={snapshot} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Аудиозаписи</CardTitle>
          <CardDescription>По умолчанию на телефоне сохраняются только аудиозаписи, которые ещё не удалось обработать. Вы можете их скачать или удалить.</CardDescription>
          <CardAction><Button type="button" variant="outline" onClick={onAudio}>Аудиозаписи</Button></CardAction>
        </CardHeader>
      </Card>
    </>
  );
}

function ProviderPage({ snapshot, onBack, onSnapshot }: { snapshot: BraiCmdSnapshot; onBack: () => void; onSnapshot: (snapshot: BraiCmdSnapshot) => void }) {
  const [mode, setMode] = useState<BraiCmdProviderMode>(snapshot.settings.providerMode);
  const [providerId, setProviderId] = useState<BraiCmdProviderId>(snapshot.settings.providerId);
  const [baseUrl, setBaseUrl] = useState(snapshot.settings.providerBaseUrl);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(snapshot.settings.providerModel);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<BraiCmdProviderTestResult | null>(null);

  async function saveCloud() {
    const next = await updateBraiCmdSettings({ providerMode: "cloud" });
    if (next) onSnapshot(next);
  }

  async function connectProvider() {
    setTesting(true);
    try {
      const tested = await testBraiCmdProvider({ providerId, apiKey, model, baseUrl });
      setResult(tested);
      if (tested?.ok) {
        const nextModels = tested.models ?? [];
        const nextModel = tested.model || model || nextModels[0] || "";
        setModels(nextModels);
        setModel(nextModel);
        const next = await saveBraiCmdProvider({ providerMode: "key", providerId, apiKey, model: nextModel, baseUrl });
        if (next) onSnapshot(next);
      }
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <PageBack title="Поставщик LLM" onBack={onBack} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Режим</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button type="button" variant={mode === "cloud" ? "default" : "outline"} onClick={() => { setMode("cloud"); void saveCloud(); }}>Облако Brai</Button>
          <Button type="button" variant={mode === "key" ? "default" : "outline"} onClick={() => setMode("key")}>Ключ поставщика</Button>
        </CardContent>
      </Card>

      {mode === "cloud" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Облако Brai</CardTitle>
            <CardDescription>Постобработка происходит на серверах Brai. Данные удаляются сразу после доставки на ваше устройство.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground">
            <p className="m-0">Сейчас бесплатное использование. В дальнейшем будет лимитировано + подписка.</p>
            <p className="m-0">Используемая модель OpenAI gpt-oss-20b: 20 млрд параметров.</p>
            <StatsGrid snapshot={snapshot} cloudOnly />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ключ поставщика</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label>Поставщик</Label>
              <Select value={providerId} onValueChange={(value) => setProviderId(value as BraiCmdProviderId)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{PROVIDERS.map((provider) => <SelectItem key={provider.id} value={provider.id}>{provider.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {providerId === "custom-openai" ? (
              <div className="grid gap-2">
                <Label htmlFor="brai-cmd-provider-base-url">Base URL</Label>
                <Input id="brai-cmd-provider-base-url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://example.com/v1" />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="brai-cmd-provider-key">API ключ</Label>
              <Input id="brai-cmd-provider-key" value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" autoComplete="off" />
            </div>
            {models.length > 0 ? (
              <div className="grid gap-2">
                <Label>Модель</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{models.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="brai-cmd-provider-model">Модель</Label>
                <Input id="brai-cmd-provider-model" value={model} onChange={(event) => setModel(event.target.value)} placeholder="Оставьте пустым, если поставщик отдаёт список" />
              </div>
            )}
            <Button type="button" disabled={testing || apiKey.trim().length === 0} onClick={() => void connectProvider()}>{testing ? "Проверка" : "Подключить"}</Button>
            {result ? <p className={cx("m-0 text-sm", result.ok ? "text-muted-foreground" : "text-destructive")}>{result.message}</p> : null}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function AudioPage({
  snapshot,
  onBack,
  onPatch,
  onSnapshot,
}: {
  snapshot: BraiCmdSnapshot;
  onBack: () => void;
  onPatch: (patch: BraiCmdSettingsPatch) => void;
  onSnapshot: (snapshot: BraiCmdSnapshot) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<BraiCmdAudioItem | null>(null);
  const [downloadStatus, setDownloadStatus] = useState("");
  const settings = snapshot.settings;
  return (
    <>
      <PageBack title="Аудиозаписи" onBack={onBack} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Настройки</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={!settings.processedAudioRetentionEnabled ? "default" : "outline"} onClick={() => onPatch({ processedAudioRetentionEnabled: false })}>Только очередь</Button>
            <Button type="button" variant={settings.processedAudioRetentionEnabled ? "default" : "outline"} onClick={() => onPatch({ processedAudioRetentionEnabled: true })}>Хранить больше аудиозаписей</Button>
          </div>
          {settings.processedAudioRetentionEnabled ? (
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="brai-cmd-audio-limit">Сколько аудиозаписей хранить?</Label>
              <Input
                id="brai-cmd-audio-limit"
                className="w-24"
                type="number"
                min={1}
                max={999}
                value={settings.processedAudioRetentionLimit}
                onChange={(event) => onPatch({ processedAudioRetentionLimit: Number(event.target.value) })}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Файлы</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {snapshot.audio.length === 0 ? <p className="m-0 text-sm text-muted-foreground">Аудиозаписей нет</p> : null}
          {snapshot.audio.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.megabytes.toFixed(2)} МБ</div>
                </div>
                <Badge variant={item.status === "queued" ? "error" : "secondary"}>{item.status === "queued" ? "в очереди" : "обработано"}</Badge>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" size="icon-sm" variant="outline" aria-label="Скачать" onClick={() => void downloadBraiCmdAudio(item.id).then((result) => setDownloadStatus(result?.message ?? ""))}><Download /></Button>
                <Button type="button" size="icon-sm" variant="outline" aria-label="Удалить" onClick={() => item.status === "queued" ? setPendingDelete(item) : void deleteBraiCmdAudio(item.id).then((next) => { if (next) onSnapshot(next); })}><Trash2 /></Button>
              </div>
              {pendingDelete?.id === item.id ? (
                <Alert variant="destructive">
                  <Trash2 />
                  <AlertTitle>Удалить запись из очереди?</AlertTitle>
                  <AlertDescription>Эта аудиозапись ещё не обработана.</AlertDescription>
                  <AlertAction>
                    <Button type="button" size="sm" variant="destructive" onClick={() => void deleteBraiCmdAudio(item.id).then((next) => { setPendingDelete(null); if (next) onSnapshot(next); })}>Удалить</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setPendingDelete(null)}>Отмена</Button>
                  </AlertAction>
                </Alert>
              ) : null}
            </div>
          ))}
          {downloadStatus ? <p className="m-0 text-sm text-muted-foreground">{downloadStatus}</p> : null}
        </CardContent>
      </Card>
    </>
  );
}

function PageBack({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Назад" onClick={onBack}><ArrowLeft /></Button>
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  );
}

function SwitchRow({ title, text, checked, onCheckedChange }: { title: string; text: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{text}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function RangeRow({ title, value, min, max, onChange }: { title: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{title}</Label>
        <span className="text-sm font-medium text-muted-foreground">{value}%</span>
      </div>
      <input className="h-2 w-full accent-primary" type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function StatsGrid({ snapshot, cloudOnly = false }: { snapshot: BraiCmdSnapshot; cloudOnly?: boolean }) {
  const stats = snapshot.stats;
  const rows = useMemo(() => cloudOnly ? [
    ["Запросов", stats.cloudRequests.toLocaleString("ru-RU")],
    ["Символов на вход", stats.cloudInputChars.toLocaleString("ru-RU")],
    ["Символов на выход", stats.cloudOutputChars.toLocaleString("ru-RU")],
  ] : [
    ["Секунд аудио", stats.audioSeconds.toLocaleString("ru-RU")],
    ["Мегабайт", stats.audioMegabytes.toFixed(2)],
    ["Символов", stats.transcriptChars.toLocaleString("ru-RU")],
    ["Запросов", stats.requests.toLocaleString("ru-RU")],
  ], [cloudOnly, stats]);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md border bg-muted/20 p-3">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}
