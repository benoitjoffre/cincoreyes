import type { Card as CardModel, ClientGameState, CommandResult, MeldSubmission, SessionData, Suit } from "@cincoreyes/contracts";
import { findValidMelds } from "@cincoreyes/game-engine";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, Check, Copy, Crown, LogIn, LogOut, Plus, Share2, Sparkles, Trophy, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { io } from "socket.io-client";
import "./App.css";

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
  const isJoker = card.rank === "joker";
  const label = isJoker ? "JOKER" : card.rank === 11 ? "V" : card.rank === 12 ? "D" : card.rank === 13 ? "R" : card.rank;
  const symbol = isJoker ? "✦" : suitSymbols[card.suit as Suit];
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`playing-card suit-${card.suit}${selected ? " selected" : ""}${grouped ? " grouped" : ""}`}
      {...dragProps}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={isJoker ? "Joker" : `${label} ${card.suit}`}
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
  const [name, setName] = useState("");
  const [code, setCode] = useState(() => new URLSearchParams(window.location.search).get("room")?.trim().toUpperCase().slice(0, 6) ?? "");
  const rulesDialogRef = useRef<HTMLDialogElement>(null);
  return (
    <main className="home-shell">
      <section className="brand-panel">
        <div className="brand-mark">
          <Crown />
        </div>
        <p className="eyebrow">Jeu de rami en ligne</p>
        <h1>
          Cinq
          <br />
          Royaumes
        </h1>
        <p className="brand-copy">Onze manches. Cinq couleurs. Une seule couronne pour le score le plus bas.</p>
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
          <p className="eyebrow">Partie privée</p>
          <h2>Prends place à la table</h2>
          <label htmlFor="player-name">Ton pseudo</label>
          <input
            id="player-name"
            value={name}
            maxLength={24}
            autoComplete="nickname"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex. Camille"
          />
          <button className="primary-button" disabled={busy || !name.trim()} onClick={() => onCreate(name)}>
            <Plus size={19} /> Créer une salle
          </button>
          <div className="divider">
            <span>ou rejoindre</span>
          </div>
          <label htmlFor="room-code">Code de salle</label>
          <div className="join-row">
            <input
              id="room-code"
              className="code-input"
              value={code}
              maxLength={6}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABC234"
            />
            <button className="icon-button" title="Rejoindre" disabled={busy || !name.trim() || code.length !== 6} onClick={() => onJoin(name, code)}>
              <LogIn />
            </button>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <p className="privacy-note">
            <Users size={16} /> 2 à 7 joueurs, sans compte
          </p>
          <button className="rules-button" type="button" onClick={() => rulesDialogRef.current?.showModal()}>
            <BookOpen size={18} /> Règles du jeu
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
            <p className="eyebrow">Cinq Royaumes</p>
            <h2 id="rules-title">Règles du jeu</h2>
          </div>
          <button className="rules-close" type="button" onClick={() => rulesDialogRef.current?.close()} aria-label="Fermer les règles">
            <X />
          </button>
        </div>
        <div className="rules-content">
          <section>
            <h3>But du jeu</h3>
            <p>
              Former des livres et des suites pour conserver le moins de points possible. Après les onze manches, le joueur au score total le plus bas
              gagne.
            </p>
          </section>
          <section>
            <h3>Les onze manches</h3>
            <p>
              La première manche se joue avec 3 cartes et les 3 sont folles. Chaque manche ajoute une carte et avance la valeur folle, jusqu’à la
              dernière manche avec 13 cartes et les Rois fous.
            </p>
          </section>
          <section>
            <h3>À ton tour</h3>
            <ol>
              <li>Pioche la première carte de la pioche ou de la défausse.</li>
              <li>Réorganise ta main pour préparer tes combinaisons.</li>
              <li>Défausse une carte pour terminer ton tour.</li>
            </ol>
          </section>
          <section>
            <h3>Combinaisons valides</h3>
            <p>
              <strong>Livre :</strong> au moins 3 cartes de même valeur, quelles que soient leurs couleurs.
            </p>
            <p>
              <strong>Suite :</strong> au moins 3 cartes consécutives de la même couleur.
            </p>
            <p>Les Jokers et toutes les cartes de la valeur folle de la manche peuvent remplacer une carte manquante.</p>
          </section>
          <section>
            <h3>Sortir</h3>
            <p>
              Si toute ta main forme des combinaisons, tu peux sortir immédiatement sans piocher. Après une pioche, tu peux aussi sortir en
              choisissant une carte à défausser. Les autres joueurs jouent alors un dernier tour.
            </p>
          </section>
          <section>
            <h3>Calcul des points</h3>
            <p>
              Les cartes placées dans des combinaisons valent 0. Seules les cartes restantes sont comptées : leur valeur faciale, 11 pour un Valet, 12
              pour une Dame, 13 pour un Roi, 20 pour une carte folle et 50 pour un Joker.
            </p>
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
}: {
  state: ClientGameState;
  playerId: string;
  busy: boolean;
  error: string;
  onStart: () => void;
  onLeave: () => void;
}) {
  const me = state.players.find(({ id }) => id === playerId);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const shareRoom = async () => {
    const invitationUrl = new URL(window.location.href);
    invitationUrl.search = "";
    invitationUrl.hash = "";
    invitationUrl.searchParams.set("room", state.roomCode);
    const shareData = {
      title: "Cinq Royaumes",
      text: `Rejoins ma partie de Cinq Royaumes avec le code ${state.roomCode}.`,
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
          <Crown /> Cinq Royaumes
        </span>
        <button className="leave-button" type="button" disabled={busy} onClick={onLeave}>
          <LogOut size={17} /> Quitter la salle
        </button>
      </header>
      <section className="lobby-content">
        <p className="eyebrow">Salle privée</p>
        <h1>La table se remplit</h1>
        <button className="room-code" onClick={() => navigator.clipboard.writeText(state.roomCode)} title="Copier le code">
          <span>{state.roomCode}</span>
          <Copy size={20} />
        </button>
        <div className="invite-actions">
          <button className="secondary-button share-button" type="button" onClick={shareRoom}>
            {shareStatus === "copied" ? <Check size={18} /> : <Share2 size={18} />}
            {shareStatus === "copied" ? "Lien copié" : "Partager la partie"}
          </button>
          <span className="share-status" aria-live="polite">
            {shareStatus === "copied" ? "Le lien d’invitation est copié." : ""}
          </span>
        </div>
        <div className="player-list">
          {state.players.map((player, index) => (
            <div className="player-row" key={player.id}>
              <span className="player-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="player-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
              <strong>
                {player.name}
                {player.id === playerId ? " (toi)" : ""}
              </strong>
              <span className="player-status">{player.isHost ? "Hôte" : "Prêt"}</span>
            </div>
          ))}
          {state.players.length < 7 && <div className="empty-seat">En attente d’un joueur…</div>}
        </div>
        {me?.isHost ? (
          <button className="primary-button start-button" disabled={busy || state.players.length < 2} onClick={onStart}>
            <Sparkles size={19} /> Lancer la partie
          </button>
        ) : (
          <p className="waiting-copy">L’hôte lancera la partie.</p>
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
  const ranking = [...state.players].sort((left, right) => left.score - right.score);

  return (
    <aside className="scoreboard" aria-label="Classement">
      <div className="scoreboard-title">
        <Trophy size={15} /> Scores
      </div>
      {ranking.map((player, index) => (
        <div className="scoreboard-row" key={player.id}>
          <span>{index + 1}</span>
          <strong>
            {player.name}
            {player.id === playerId ? " · toi" : ""}
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
}: {
  state: ClientGameState;
  playerId: string;
  busy: boolean;
  error: string;
  onDraw: (source: "deck" | "discard") => void;
  onDiscard: (cardId: string) => void;
  onGoOut: (melds: MeldSubmission[], discardCardId?: string) => void;
  onLeave: () => void;
}) {
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
        <p className="eyebrow">Partie terminée</p>
        <h1>{ranking[0]?.name} remporte la couronne</h1>
        {ranking.map((player, index) => (
          <div className="result-row" key={player.id}>
            <span>#{index + 1}</span>
            <strong>{player.name}</strong>
            <b>{player.score} pts</b>
          </div>
        ))}
        <button className="primary-button results-leave-button" type="button" disabled={busy} onClick={onLeave}>
          <LogOut size={18} /> Retour à l’accueil
        </button>
      </main>
    );
  }
  return (
    <main className="game-shell">
      <Scoreboard state={state} playerId={playerId} />
      <header className="game-header">
        <span className="mini-brand">
          <Crown /> Cinq Royaumes
        </span>
        <div className="round-info">
          <small>Manche</small>
          <strong>{state.roundRank}</strong>
          <span>Folle : {state.roundRank}</span>
        </div>
        <div className="game-header-actions">
          <span className="table-code">Salle {state.roomCode}</span>
          <button className="leave-button" type="button" disabled={busy} onClick={onLeave}>
            <LogOut size={17} /> <span>Quitter</span>
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
                  {player.score} pts · {player.cardCount} cartes
                </small>
              </div>
              {!player.connected && <span className="offline-dot">Absent</span>}
            </div>
          ))}
      </section>
      <section className="table-center">
        <div className="turn-banner">
          {state.phase === "paused"
            ? "Partie en pause"
            : wentOutPlayer
              ? `${wentOutPlayer.name} est sorti${wentOutPlayer.id === playerId ? " · bravo !" : " ! Dernier tour"}`
              : isMyTurn
                ? "À toi de jouer"
                : `Tour de ${activePlayer?.name ?? "…"}`}
        </div>
        {state.revealedPlayerMelds.length > 0 && (
          <div className="revealed-area" aria-live="polite">
            {state.revealedPlayerMelds.map(({ playerId: revealedPlayerId, melds }) => {
              const player = state.players.find(({ id }) => id === revealedPlayerId);
              return (
                <section className="revealed-player" key={revealedPlayerId}>
                  <div className="revealed-title">
                    <Crown size={17} />
                    <strong>{player?.name ?? "Un joueur"} sort ses cartes</strong>
                  </div>
                  <div className="revealed-melds">
                    {melds.map((meld, meldIndex) => (
                      <div className="revealed-meld" key={`${revealedPlayerId}-${meld.type}-${meldIndex}`}>
                        <small>{meld.type === "book" ? "Livre" : "Suite"}</small>
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
          <button className="deck-pile" disabled={!canDraw || busy} onClick={() => onDraw("deck")} aria-label="Piocher">
            <Crown />
            <span>{state.drawPileCount}</span>
          </button>
          <div className="discard-zone">
            {state.discardTop ? <Card card={state.discardTop} onClick={canDraw ? () => onDraw("discard") : undefined} /> : <span>Vide</span>}
            <small>Défausse</small>
          </div>
        </div>
      </section>
      <section className="hand-zone">
        <div className="hand-toolbar">
          <div>
            <small>Ta main</small>
            <strong>{state.hand.length} cartes</strong>
          </div>
          <p className={`turn-hint${canGoOut ? " ready" : ""}`}>
            {canGoOutDirectly
              ? "Ta main est complète : tu peux sortir sans piocher"
              : state.phase === "drawing"
                ? "Pioche une carte"
                : canGoOut
                  ? "Ta main est valide : tu peux sortir"
                  : "Clique la carte que tu veux défausser"}
          </p>
        </div>
        {displayedMelds && (
          <div className="meld-summary">
            <strong>Sortie prête</strong>
            {displayedMelds.map((meld, index) => (
              <span key={`${meld.type}-${index}`}>
                {meld.type === "book" ? "Livre" : "Suite"} · {meld.cardIds.length}
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
            Défausser
          </button>
          <button
            className="primary-button"
            disabled={!canGoOut || busy}
            onClick={() => {
              if (canGoOutDirectly && directMelds) onGoOut(directMelds);
              else if (selectedDiscardId && discardMelds) onGoOut(discardMelds, selectedDiscardId);
            }}
          >
            <Crown size={18} /> Sortir maintenant
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
      else localStorage.removeItem(sessionStorageKey);
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
      setError(result.message);
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
      setError(result.message);
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
    />
  );
}
