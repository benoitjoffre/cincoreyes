import {
  disconnectedPlayerKickDelayMs,
  type Card as CardModel,
  type ClientGameState,
  type CommandResult,
  type MeldSubmission,
  type PublicPlayer,
  type Reaction,
  type SessionData,
  type Suit,
} from "@cincoreyes/contracts";
import { findValidMelds } from "@cincoreyes/game-engine";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, Check, Copy, Crown, LogIn, LogOut, Plus, Share2, Sparkles, Trophy, UserX, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { io } from "socket.io-client";
import "./App.css";
import { useI18n } from "./i18n-context";
import { LanguageSwitcher, type TranslationKey } from "./i18n";

const configuredServerUrl = import.meta.env.VITE_SERVER_URL?.trim();
const configuredServerHost = import.meta.env.VITE_SERVER_HOST?.trim();
const serverUrl = configuredServerUrl || (configuredServerHost ? `https://${configuredServerHost}` : undefined);
const socket = serverUrl ? io(serverUrl, { autoConnect: false }) : io({ autoConnect: false });
const sessionStorageKey = "cinq-royaumes-session";
const suitSymbols: Record<Suit, string> = {
  stars: "★",
  hearts: "♥",
  clubs: "♣",
  spades: "♠",
  diamonds: "♦",
};

function actionId(): string {
  return crypto.randomUUID();
}
function emitCommand<T>(event: string, payload: object): Promise<CommandResult<T>> {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function Card({
  card,
  selected = false,
  grouped = false,
  onClick,
  buttonRef,
  dragProps,
}: {
  card: CardModel;
  selected?: boolean;
  grouped?: boolean;
  onClick?: () => void;
  buttonRef?: (node: HTMLButtonElement | null) => void;
  dragProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const { language, t } = useI18n();
  const isJoker = card.rank === "joker";
  const label = isJoker
    ? "JOKER"
    : card.rank === 11
      ? language === "fr"
        ? "V"
        : "J"
      : card.rank === 12
        ? language === "fr"
          ? "D"
          : "Q"
        : card.rank === 13
          ? "R"
          : card.rank;
  const symbol = isJoker ? "✦" : suitSymbols[card.suit as Suit];
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`playing-card suit-${card.suit}${selected ? " selected" : ""}${grouped ? " grouped" : ""}`}
      {...dragProps}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={isJoker ? t("card.joker") : `${label} ${t(`suit.${card.suit}` as TranslationKey)}`}
    >
      <span className="card-corner">
        {label}
        <small>{symbol}</small>
      </span>
      <span className="card-symbol" aria-hidden="true">
        {symbol}
      </span>
      <span className="card-corner card-corner-bottom">
        {label}
        <small>{symbol}</small>
      </span>
    </button>
  );
}

function SortableHandCard({ card, selected, grouped, onClick }: { card: CardModel; selected: boolean; grouped: boolean; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  return (
    <div className={`sortable-card${isDragging ? " dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <Card card={card} selected={selected} grouped={grouped} onClick={onClick} buttonRef={setNodeRef} dragProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function EmojiPicker({
  player,
  reactions,
  onSendEmoji,
}: {
  player: PublicPlayer;
  reactions: Reaction[];
  onSendEmoji: (targetPlayerId: string, emoji: string) => void;
}) {
  const emojiOptions = ["🙂", "😄", "😂", "😍", "🔥", "👏", "💩", "🖕"];
  return (
    <div className="emoji-picker">
      <div className="emoji-buttons">
        {emojiOptions.map((emoji) => (
          <button
            key={`${player.id}-${emoji}`}
            type="button"
            className="emoji-button"
            aria-label={`Envoyer ${emoji} à ${player.name}`}
            title={`Envoyer ${emoji} à ${player.name}`}
            onClick={() => onSendEmoji(player.id, emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      {reactions.length > 0 && <span className="reaction-bubble">{reactions[reactions.length - 1].emoji}</span>}
    </div>
  );
}

function DisconnectedPlayerControl({
  player,
  canKick,
  busy,
  onKick,
}: {
  player: PublicPlayer;
  canKick: boolean;
  busy: boolean;
  onKick: (playerId: string) => void;
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(player.disconnectedAt ?? 0);
  useEffect(() => {
    if (player.disconnectedAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [player.disconnectedAt]);
  if (player.disconnectedAt === null) return null;
  const remainingSeconds = Math.max(0, Math.ceil((player.disconnectedAt + disconnectedPlayerKickDelayMs - now) / 1_000));

  return (
    <div className="disconnected-control">
      <span className="offline-dot">{t("player.awayCountdown", { seconds: remainingSeconds })}</span>
      {canKick && (
        <button
          className="kick-button"
          type="button"
          disabled={busy || remainingSeconds > 0}
          onClick={() => onKick(player.id)}
          title={remainingSeconds > 0 ? t("player.kickCountdown", { seconds: remainingSeconds }) : t("player.kick", { name: player.name })}
          aria-label={remainingSeconds > 0 ? t("player.kickCountdown", { seconds: remainingSeconds }) : t("player.kick", { name: player.name })}
        >
          <UserX size={15} />
        </button>
      )}
    </div>
  );
}

function Home({
  busy,
  error,
  onCreate,
  onJoin,
}: {
  busy: boolean;
  error: string;
  onCreate: (name: string) => void;
  onJoin: (name: string, code: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get("room")?.trim().toUpperCase().slice(0, 6) ?? "");
  const rulesDialogRef = useRef<HTMLDialogElement>(null);
  return (
    <main className="home-shell">
      <section className="brand-panel">
        <div className="home-language">
          <LanguageSwitcher />
        </div>
        <div className="brand-mark">
          <Crown />
        </div>
        <p className="eyebrow">{t("home.tagline")}</p>
        <h1>{t("brand.name")}</h1>
        <p className="brand-copy">{t("home.description")}</p>
        <div className="suit-ribbon" aria-hidden="true">
          {Object.entries(suitSymbols).map(([suit, symbol]) => (
            <span className={`suit-${suit}`} key={suit}>
              {symbol}
            </span>
          ))}
        </div>
      </section>
      <section className="entry-panel">
        <div className="entry-inner">
          <p className="eyebrow">{t("home.privateGame")}</p>
          <h2>{t("home.title")}</h2>
          <label htmlFor="player-name">{t("home.nickname")}</label>
          <input
            id="player-name"
            value={name}
            maxLength={24}
            autoComplete="nickname"
            onChange={(event) => setName(event.target.value)}
            placeholder={t("home.nicknamePlaceholder")}
          />
          <button className="primary-button" disabled={busy || !name.trim()} onClick={() => onCreate(name)}>
            <Plus size={19} /> {t("home.create")}
          </button>
          <div className="divider">
            <span>{t("home.orJoin")}</span>
          </div>
          <label htmlFor="room-code">{t("home.roomCode")}</label>
          <div className="join-row">
            <input
              id="room-code"
              className="code-input"
              value={code}
              maxLength={6}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABC234"
            />
            <button
              className="icon-button"
              title={t("home.join")}
              disabled={busy || !name.trim() || code.length !== 6}
              onClick={() => onJoin(name, code)}
            >
              <LogIn />
            </button>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <p className="privacy-note">
            <Users size={16} /> {t("home.privacy")}
          </p>
          <button className="rules-button" type="button" onClick={() => rulesDialogRef.current?.showModal()}>
            <BookOpen size={18} /> {t("rules.open")}
          </button>
        </div>
      </section>
      <dialog
        className="rules-dialog"
        ref={rulesDialogRef}
        aria-labelledby="rules-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") rulesDialogRef.current?.close();
        }}
      >
        <div className="rules-header">
          <div>
            <p className="eyebrow">{t("brand.name")}</p>
            <h2 id="rules-title">{t("rules.open")}</h2>
          </div>
          <button className="rules-close" type="button" onClick={() => rulesDialogRef.current?.close()} aria-label={t("rules.close")}>
            <X />
          </button>
        </div>
        <div className="rules-content">
          <section>
            <h3>{t("rules.goalTitle")}</h3>
            <p>{t("rules.goal")}</p>
          </section>
          <section>
            <h3>{t("rules.roundsTitle")}</h3>
            <p>{t("rules.rounds")}</p>
          </section>
          <section>
            <h3>{t("rules.turnTitle")}</h3>
            <ol>
              <li>{t("rules.turnDraw")}</li>
              <li>{t("rules.turnArrange")}</li>
              <li>{t("rules.turnDiscard")}</li>
            </ol>
          </section>
          <section>
            <h3>{t("rules.meldsTitle")}</h3>
            <p>
              <strong>{t("rules.bookLabel")}</strong> {t("rules.book")}
            </p>
            <p>
              <strong>{t("rules.runLabel")}</strong> {t("rules.run")}
            </p>
            <p>{t("rules.wild")}</p>
          </section>
          <section>
            <h3>{t("rules.goOutTitle")}</h3>
            <p>{t("rules.goOut")}</p>
          </section>
          <section>
            <h3>{t("rules.scoringTitle")}</h3>
            <p>{t("rules.scoring")}</p>
          </section>
        </div>
      </dialog>
    </main>
  );
}

function Lobby({
  state,
  playerId,
  busy,
  error,
  onStart,
  onLeave,
  onKick,
}: {
  state: ClientGameState;
  playerId: string;
  busy: boolean;
  error: string;
  onStart: () => void;
  onLeave: () => void;
  onKick: (playerId: string) => void;
}) {
  const { t } = useI18n();
  const me = state.players.find(({ id }) => id === playerId);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const shareRoom = async () => {
    const invitationUrl = new URL(window.location.href);
    invitationUrl.search = "";
    invitationUrl.hash = "";
    invitationUrl.searchParams.set("room", state.roomCode);
    const shareData = {
      title: t("brand.name"),
      text: t("lobby.shareText", { code: state.roomCode }),
      url: invitationUrl.toString(),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(invitationUrl.toString());
    setShareStatus("copied");
    window.setTimeout(() => setShareStatus("idle"), 2500);
  };
  return (
    <main className="lobby-shell">
      <header className="topbar">
        <span className="mini-brand">
          <Crown /> {t("brand.name")}
        </span>
        <div className="topbar-actions">
          <LanguageSwitcher />
          <button className="leave-button" type="button" disabled={busy} onClick={onLeave}>
            <LogOut size={17} /> <span>{t("lobby.leave")}</span>
          </button>
        </div>
      </header>
      <section className="lobby-content">
        <p className="eyebrow">{t("lobby.privateRoom")}</p>
        <h1>{t("lobby.title")}</h1>
        <button className="room-code" onClick={() => navigator.clipboard.writeText(state.roomCode)} title={t("lobby.copyCode")}>
          <span>{state.roomCode}</span>
          <Copy size={20} />
        </button>
        <div className="invite-actions">
          <button className="secondary-button share-button" type="button" onClick={shareRoom}>
            {shareStatus === "copied" ? <Check size={18} /> : <Share2 size={18} />}
            {shareStatus === "copied" ? t("lobby.linkCopied") : t("lobby.share")}
          </button>
          <span className="share-status" aria-live="polite">
            {shareStatus === "copied" ? t("lobby.linkCopiedStatus") : ""}
          </span>
        </div>
        <div className="player-list">
          {state.players.map((player, index) => (
            <div className="player-row" key={player.id}>
              <span className="player-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="player-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
              <strong>
                {player.name}
                {player.id === playerId ? ` (${t("lobby.you")})` : ""}
              </strong>
              {player.connected ? (
                <span className="player-status">{player.isHost ? t("lobby.host") : t("lobby.ready")}</span>
              ) : (
                <DisconnectedPlayerControl player={player} canKick={me?.isHost === true} busy={busy} onKick={onKick} />
              )}
            </div>
          ))}
          {state.players.length < 7 && <div className="empty-seat">{t("lobby.waitingPlayer")}</div>}
        </div>
        {me?.isHost ? (
          <button className="primary-button start-button" disabled={busy || state.players.length < 2} onClick={onStart}>
            <Sparkles size={19} /> {t("lobby.start")}
          </button>
        ) : (
          <p className="waiting-copy">{t("lobby.hostWillStart")}</p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

function Scoreboard({ state, playerId }: { state: ClientGameState; playerId: string }) {
  const { t } = useI18n();
  const ranking = [...state.players].sort((left, right) => left.score - right.score);

  return (
    <aside className="scoreboard" aria-label={t("game.scores")}>
      <div className="scoreboard-title">
        <Trophy size={15} /> {t("game.scores")}
      </div>
      {ranking.map((player, index) => (
        <div className="scoreboard-row" key={player.id}>
          <span>{index + 1}</span>
          <strong>
            {player.name}
            {player.id === playerId ? ` · ${t("lobby.you")}` : ""}
          </strong>
          <b>{player.score}</b>
        </div>
      ))}
    </aside>
  );
}

function Game({
  state,
  playerId,
  busy,
  error,
  onDraw,
  onDiscard,
  onGoOut,
  onLeave,
  onKick,
  onSendEmoji,
}: {
  state: ClientGameState;
  playerId: string;
  busy: boolean;
  error: string;
  onDraw: (source: "deck" | "discard") => void;
  onDiscard: (cardId: string) => void;
  onGoOut: (melds: MeldSubmission[], discardCardId?: string) => void;
  onLeave: () => void;
  onKick: (playerId: string) => void;
  onSendEmoji: (targetPlayerId: string, emoji: string) => void;
}) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customOrder, setCustomOrder] = useState<{ roundRank: number; cardIds: string[] } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const isMyTurn = state.activePlayerId === playerId;
  const canDraw = isMyTurn && state.phase === "drawing";
  const handIds = new Set(state.hand.map(({ id }) => id));
  const visibleSelectedIds = selectedIds.filter((id) => handIds.has(id));
  const selectedDiscardId = visibleSelectedIds.length === 1 ? visibleSelectedIds[0] : undefined;
  const canDiscard = isMyTurn && state.phase === "discarding" && selectedDiscardId !== undefined;
  const directMelds = state.phase === "drawing" ? findValidMelds(state.hand, state.roundRank) : null;
  const remainingHand = selectedDiscardId ? state.hand.filter(({ id }) => id !== selectedDiscardId) : [];
  const discardMelds = selectedDiscardId ? findValidMelds(remainingHand, state.roundRank) : null;
  const displayedMelds = directMelds ?? discardMelds;
  const groupedIds = new Set(displayedMelds?.flatMap(({ cardIds }) => cardIds) ?? []);
  const groupedCardIds = displayedMelds?.flatMap(({ cardIds }) => cardIds) ?? [];
  const suggestedCardIds = [...groupedCardIds, ...state.hand.filter(({ id }) => !groupedIds.has(id)).map(({ id }) => id)];
  const customCardIds = customOrder?.roundRank === state.roundRank ? customOrder.cardIds : [];
  const customCardIdSet = new Set(customCardIds);
  const visibleCardOrder = customCardIds.length
    ? [...customCardIds.filter((id) => handIds.has(id)), ...suggestedCardIds.filter((id) => !customCardIdSet.has(id))]
    : suggestedCardIds;
  const cardsById = new Map(state.hand.map((card) => [card.id, card]));
  const orderedHand = visibleCardOrder.flatMap((cardId) => {
    const card = cardsById.get(cardId);
    return card ? [card] : [];
  });
  const canGoOutDirectly = isMyTurn && state.phase === "drawing" && directMelds !== null;
  const canGoOutAfterDiscard = canDiscard && discardMelds !== null;
  const canGoOut = canGoOutDirectly || canGoOutAfterDiscard;
  const activePlayer = state.players.find(({ id }) => id === state.activePlayerId);
  const wentOutPlayer = state.players.find(({ id }) => id === state.wentOutPlayerId);
  const me = state.players.find(({ id }) => id === playerId);
  const toggleCard = (cardId: string) => {
    setSelectedIds((current) => (current.includes(cardId) ? [] : [cardId]));
  };
  const reorderCards = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = visibleCardOrder.indexOf(String(active.id));
    const newIndex = visibleCardOrder.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setCustomOrder({ roundRank: state.roundRank, cardIds: arrayMove(visibleCardOrder, oldIndex, newIndex) });
  };
  if (state.phase === "game-ended") {
    const ranking = [...state.players].sort((left, right) => left.score - right.score);
    return (
      <main className="results-shell">
        <Crown size={54} />
        <p className="eyebrow">{t("game.finished")}</p>
        <h1>{t("game.winner", { name: ranking[0]?.name ?? "" })}</h1>
        {ranking.map((player, index) => (
          <div className="result-row" key={player.id}>
            <span>#{index + 1}</span>
            <strong>{player.name}</strong>
            <b>{t("game.points", { count: player.score })}</b>
          </div>
        ))}
        <button className="primary-button results-leave-button" type="button" disabled={busy} onClick={onLeave}>
          <LogOut size={18} /> {t("game.home")}
        </button>
      </main>
    );
  }
  return (
    <main className="game-shell">
      <Scoreboard state={state} playerId={playerId} />
      <header className="game-header">
        <span className="mini-brand">
          <Crown /> {t("brand.name")}
        </span>
        <div className="round-info">
          <small>{t("game.round")}</small>
          <strong>{state.roundRank}</strong>
          <span>{t("game.wild", { rank: state.roundRank })}</span>
        </div>
        <div className="game-header-actions">
          <span className="table-code">{t("game.room", { code: state.roomCode })}</span>
          <LanguageSwitcher />
          <button className="leave-button" type="button" disabled={busy} onClick={onLeave}>
            <LogOut size={17} /> <span>{t("game.leave")}</span>
          </button>
        </div>
      </header>
      <section className="opponents">
        {state.players
          .filter(({ id }) => id !== playerId)
          .map((player) => (
            <div className={`opponent${player.id === state.activePlayerId ? " active" : ""}`} key={player.id}>
              <span className="player-avatar">{player.name[0]?.toUpperCase()}</span>
              <div>
                <strong>{player.name}</strong>
                <small>
                  {t("game.points", { count: player.score })} · {t("game.cards", { count: player.cardCount })}
                </small>
              </div>
              {!player.connected && <DisconnectedPlayerControl player={player} canKick={me?.isHost === true} busy={busy} onKick={onKick} />}
              <EmojiPicker
                player={player}
                reactions={state.reactions.filter((reaction) => reaction.toPlayerId === player.id)}
                onSendEmoji={onSendEmoji}
              />
            </div>
          ))}
      </section>
      <section className="table-center">
        <div className="turn-banner">
          {state.phase === "paused"
            ? t("game.paused")
            : wentOutPlayer
              ? t(wentOutPlayer.id === playerId ? "game.wentOutSelf" : "game.wentOutOther", { name: wentOutPlayer.name })
              : isMyTurn
                ? t("game.yourTurn")
                : t("game.playerTurn", { name: activePlayer?.name ?? "…" })}
        </div>
        {state.revealedPlayerMelds.length > 0 && (
          <div className="revealed-area" aria-live="polite">
            {state.revealedPlayerMelds.map(({ playerId: revealedPlayerId, melds }) => {
              const player = state.players.find(({ id }) => id === revealedPlayerId);
              return (
                <section className="revealed-player" key={revealedPlayerId}>
                  <div className="revealed-title">
                    <Crown size={17} />
                    <strong>{t("game.playerReveals", { name: player?.name ?? t("game.aPlayer") })}</strong>
                  </div>
                  <div className="revealed-melds">
                    {melds.map((meld, meldIndex) => (
                      <div className="revealed-meld" key={`${revealedPlayerId}-${meld.type}-${meldIndex}`}>
                        <small>{t(meld.type === "book" ? "game.book" : "game.run")}</small>
                        <div>
                          {meld.cards.map((card) => (
                            <Card key={card.id} card={card} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
        <div className="piles">
          <button className="deck-pile" disabled={!canDraw || busy} onClick={() => onDraw("deck")} aria-label={t("game.draw")}>
            <Crown />
            <span>{state.drawPileCount}</span>
          </button>
          <div className="discard-zone">
            {state.discardTop ? (
              <Card card={state.discardTop} onClick={canDraw ? () => onDraw("discard") : undefined} />
            ) : (
              <span>{t("game.empty")}</span>
            )}
            <small>{t("game.discardPile")}</small>
          </div>
        </div>
      </section>
      <section className="hand-zone">
        <div className="hand-toolbar">
          <div>
            <small>{t("game.yourHand")}</small>
            <strong>{t("game.cards", { count: state.hand.length })}</strong>
          </div>
          <p className={`turn-hint${canGoOut ? " ready" : ""}`}>
            {canGoOutDirectly
              ? t("game.directReady")
              : state.phase === "drawing"
                ? t("game.drawCard")
                : canGoOut
                  ? t("game.ready")
                  : t("game.selectDiscard")}
          </p>
        </div>
        {displayedMelds && (
          <div className="meld-summary">
            <strong>{t("game.goOutReady")}</strong>
            {displayedMelds.map((meld, index) => (
              <span key={`${meld.type}-${index}`}>
                {t(meld.type === "book" ? "game.book" : "game.run")} · {meld.cardIds.length}
              </span>
            ))}
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderCards}>
          <SortableContext items={visibleCardOrder} strategy={rectSortingStrategy}>
            <div className="hand-cards">
              {orderedHand.map((card) => (
                <SortableHandCard
                  key={card.id}
                  card={card}
                  selected={visibleSelectedIds.includes(card.id)}
                  grouped={groupedIds.has(card.id)}
                  onClick={state.phase === "discarding" ? () => toggleCard(card.id) : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div className="turn-actions">
          <button className="secondary-button" disabled={!canDiscard || busy} onClick={() => selectedDiscardId && onDiscard(selectedDiscardId)}>
            {t("game.discard")}
          </button>
          <button
            className="primary-button"
            disabled={!canGoOut || busy}
            onClick={() => {
              if (canGoOutDirectly && directMelds) onGoOut(directMelds);
              else if (selectedDiscardId && discardMelds) onGoOut(discardMelds, selectedDiscardId);
            }}
          >
            <Crown size={18} /> {t("game.goOut")}
          </button>
        </div>
        {error && (
          <p className="error-message game-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

export default function App() {
  const { errorMessage } = useI18n();
  const [session, setSession] = useState<SessionData | null>(null);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const handleState = (state: ClientGameState) => {
      setGameState(state);
      if (state.phase === "game-ended") localStorage.removeItem(sessionStorageKey);
    };
    const handleConnect = async () => {
      const stored = localStorage.getItem(sessionStorageKey);
      if (!stored) return;
      const previous = JSON.parse(stored) as SessionData;
      const invitedRoomCode = new URLSearchParams(window.location.search).get("room")?.trim().toUpperCase();
      if (invitedRoomCode && invitedRoomCode !== previous.roomCode) {
        localStorage.removeItem(sessionStorageKey);
        return;
      }
      const result = await emitCommand<SessionData>("room:resume", {
        sessionToken: previous.sessionToken,
      });
      if (result.ok) setSession(result.data);
      else {
        localStorage.removeItem(sessionStorageKey);
        setSession(null);
        setGameState(null);
      }
    };
    socket.on("game:state", handleState);
    socket.on("connect", handleConnect);
    socket.connect();
    return () => {
      socket.off("game:state", handleState);
      socket.off("connect", handleConnect);
      socket.disconnect();
    };
  }, []);
  const run = async <T,>(event: string, payload: object, onSuccess?: (data: T) => void) => {
    setBusy(true);
    setError("");
    const result = await emitCommand<T>(event, payload);
    setBusy(false);
    if (!result.ok) {
      setError(errorMessage(result.code, result.message));
      return;
    }
    onSuccess?.(result.data);
  };
  const saveSession = (next: SessionData) => {
    setSession(next);
    localStorage.setItem(sessionStorageKey, JSON.stringify(next));
  };
  const clearSession = () => {
    localStorage.removeItem(sessionStorageKey);
    setSession(null);
    setGameState(null);
    setError("");
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("room");
    window.history.replaceState({}, "", cleanUrl);
  };
  const leaveRoom = async () => {
    setBusy(true);
    setError("");
    const result = await emitCommand("room:leave", {});
    setBusy(false);
    if (!result.ok && result.code !== "NOT_IN_ROOM") {
      setError(errorMessage(result.code, result.message));
      return;
    }
    clearSession();
  };
  if (!session || !gameState)
    return (
      <Home
        busy={busy}
        error={error}
        onCreate={(playerName) => run<SessionData>("room:create", { playerName }, saveSession)}
        onJoin={(playerName, roomCode) => run<SessionData>("room:join", { playerName, roomCode }, saveSession)}
      />
    );
  if (gameState.phase === "lobby")
    return (
      <Lobby
        state={gameState}
        playerId={session.playerId}
        busy={busy}
        error={error}
        onStart={() => run("game:start", { actionId: actionId() })}
        onLeave={leaveRoom}
        onKick={(playerId) => run("room:kick", { playerId })}
      />
    );
  return (
    <Game
      key={`${gameState.roomCode}:${gameState.roundRank}`}
      state={gameState}
      playerId={session.playerId}
      busy={busy}
      error={error}
      onDraw={(source) => run("turn:draw", { actionId: actionId(), source })}
      onDiscard={(cardId) => run("turn:discard", { actionId: actionId(), cardId })}
      onGoOut={(melds, discardCardId) => run("turn:go-out", { actionId: actionId(), melds, discardCardId })}
      onLeave={leaveRoom}
      onKick={(playerId) => run("room:kick", { playerId })}
      onSendEmoji={(targetPlayerId, emoji) => run("game:emoji", { targetPlayerId, emoji })}
    />
  );
}
