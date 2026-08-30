import type { Card as CardModel, ClientGameState, CommandResult, MeldSubmission, SessionData, Suit } from "@cincoreyes/contracts";
import { findValidMelds } from "@cincoreyes/game-engine";
import { Copy, Crown, LogIn, Plus, Sparkles, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
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
}: {
  card: CardModel;
  selected?: boolean;
  grouped?: boolean;
  onClick?: () => void;
}) {
  const isJoker = card.rank === "joker";
  const label = isJoker ? "J" : card.rank === 11 ? "V" : card.rank === 12 ? "D" : card.rank === 13 ? "R" : card.rank;
  const symbol = isJoker ? "✦" : suitSymbols[card.suit as Suit];
  return (
    <button
      type="button"
      className={`playing-card suit-${card.suit}${selected ? " selected" : ""}${grouped ? " grouped" : ""}`}
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
  const [code, setCode] = useState("");
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
        </div>
      </section>
    </main>
  );
}

function Lobby({
  state,
  playerId,
  busy,
  error,
  onStart,
}: {
  state: ClientGameState;
  playerId: string;
  busy: boolean;
  error: string;
  onStart: () => void;
}) {
  const me = state.players.find(({ id }) => id === playerId);
  return (
    <main className="lobby-shell">
      <header className="topbar">
        <span className="mini-brand">
          <Crown /> Cinq Royaumes
        </span>
        <span>En attente</span>
      </header>
      <section className="lobby-content">
        <p className="eyebrow">Salle privée</p>
        <h1>La table se remplit</h1>
        <button className="room-code" onClick={() => navigator.clipboard.writeText(state.roomCode)} title="Copier le code">
          <span>{state.roomCode}</span>
          <Copy size={20} />
        </button>
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
}: {
  state: ClientGameState;
  playerId: string;
  busy: boolean;
  error: string;
  onDraw: (source: "deck" | "discard") => void;
  onDiscard: (cardId: string) => void;
  onGoOut: (melds: MeldSubmission[], discardCardId: string) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isMyTurn = state.activePlayerId === playerId;
  const canDraw = isMyTurn && state.phase === "drawing";
  const handIds = new Set(state.hand.map(({ id }) => id));
  const visibleSelectedIds = selectedIds.filter((id) => handIds.has(id));
  const selectedDiscardId = visibleSelectedIds.length === 1 ? visibleSelectedIds[0] : undefined;
  const canDiscard = isMyTurn && state.phase === "discarding" && selectedDiscardId !== undefined;
  const remainingHand = selectedDiscardId ? state.hand.filter(({ id }) => id !== selectedDiscardId) : [];
  const suggestedMelds = selectedDiscardId ? findValidMelds(remainingHand, state.roundRank) : null;
  const groupedIds = new Set(suggestedMelds?.flatMap(({ cardIds }) => cardIds) ?? []);
  const canGoOut = canDiscard && suggestedMelds !== null;
  const activePlayer = state.players.find(({ id }) => id === state.activePlayerId);
  const toggleCard = (cardId: string) => {
    setSelectedIds((current) => (current.includes(cardId) ? [] : [cardId]));
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
        <span className="table-code">Salle {state.roomCode}</span>
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
          {state.phase === "paused" ? "Partie en pause" : isMyTurn ? "À toi de jouer" : `Tour de ${activePlayer?.name ?? "…"}`}
        </div>
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
            {state.phase === "drawing"
              ? "Pioche une carte"
              : canGoOut
                ? "Ta main est valide : tu peux sortir"
                : "Clique la carte que tu veux défausser"}
          </p>
        </div>
        {suggestedMelds && (
          <div className="meld-summary">
            <strong>Sortie prête</strong>
            {suggestedMelds.map((meld, index) => (
              <span key={`${meld.type}-${index}`}>
                {meld.type === "book" ? "Livre" : "Suite"} · {meld.cardIds.length}
              </span>
            ))}
          </div>
        )}
        <div className="hand-cards">
          {state.hand.map((card) => (
            <Card
              key={card.id}
              card={card}
              selected={visibleSelectedIds.includes(card.id)}
              grouped={groupedIds.has(card.id)}
              onClick={() => toggleCard(card.id)}
            />
          ))}
        </div>
        <div className="turn-actions">
          <button className="secondary-button" disabled={!canDiscard || busy} onClick={() => selectedDiscardId && onDiscard(selectedDiscardId)}>
            Défausser
          </button>
          <button
            className="primary-button"
            disabled={!canGoOut || busy}
            onClick={() => selectedDiscardId && suggestedMelds && onGoOut(suggestedMelds, selectedDiscardId)}
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
    const handleState = (state: ClientGameState) => setGameState(state);
    const handleConnect = async () => {
      const stored = localStorage.getItem(sessionStorageKey);
      if (!stored) return;
      const previous = JSON.parse(stored) as SessionData;
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
      <Lobby state={gameState} playerId={session.playerId} busy={busy} error={error} onStart={() => run("game:start", { actionId: actionId() })} />
    );
  return (
    <Game
      key={`${gameState.roundRank}:${gameState.activePlayerId}:${gameState.phase}`}
      state={gameState}
      playerId={session.playerId}
      busy={busy}
      error={error}
      onDraw={(source) => run("turn:draw", { actionId: actionId(), source })}
      onDiscard={(cardId) => run("turn:discard", { actionId: actionId(), cardId })}
      onGoOut={(melds, discardCardId) => run("turn:go-out", { actionId: actionId(), melds, discardCardId })}
    />
  );
}
