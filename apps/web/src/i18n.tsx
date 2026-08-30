import { useEffect, useState, type ReactNode } from "react";
import { I18nContext, useI18n, type TranslationValues } from "./i18n-context";

export type Language = "fr" | "es";

const fr = {
  "language.label": "Langue",
  "brand.name": "Cinq Royaumes",
  "meta.description": "Rejoins une partie privée de Cinq Royaumes, le jeu de rami en ligne pour 2 à 7 joueurs.",
  "meta.socialDescription": "Rejoins une partie privée de Cinq Royaumes avec tes proches.",
  "home.tagline": "Jeu de rami en ligne",
  "home.description": "Onze manches. Cinq couleurs. Une seule couronne pour le score le plus bas.",
  "home.privateGame": "Partie privée",
  "home.title": "Prends place à la table",
  "home.nickname": "Ton pseudo",
  "home.nicknamePlaceholder": "Ex. Camille",
  "home.create": "Créer une salle",
  "home.orJoin": "ou rejoindre",
  "home.roomCode": "Code de salle",
  "home.join": "Rejoindre",
  "home.privacy": "2 à 7 joueurs, sans compte",
  "rules.open": "Règles du jeu",
  "rules.close": "Fermer les règles",
  "rules.goalTitle": "But du jeu",
  "rules.goal":
    "Former des livres et des suites pour conserver le moins de points possible. Après les onze manches, le joueur au score total le plus bas gagne.",
  "rules.roundsTitle": "Les onze manches",
  "rules.rounds":
    "La première manche se joue avec 3 cartes et les 3 sont folles. Chaque manche ajoute une carte et avance la valeur folle, jusqu’à la dernière manche avec 13 cartes et les Rois fous.",
  "rules.turnTitle": "À ton tour",
  "rules.turnDraw": "Pioche la première carte de la pioche ou de la défausse.",
  "rules.turnArrange": "Réorganise ta main pour préparer tes combinaisons.",
  "rules.turnDiscard": "Défausse une carte pour terminer ton tour.",
  "rules.meldsTitle": "Combinaisons valides",
  "rules.bookLabel": "Livre :",
  "rules.book": "au moins 3 cartes de même valeur, quelles que soient leurs couleurs.",
  "rules.runLabel": "Suite :",
  "rules.run": "au moins 3 cartes consécutives de la même couleur.",
  "rules.wild": "Les Jokers et toutes les cartes de la valeur folle de la manche peuvent remplacer une carte manquante.",
  "rules.goOutTitle": "Sortir",
  "rules.goOut":
    "Si toute ta main forme des combinaisons, tu peux sortir immédiatement sans piocher. Après une pioche, tu peux aussi sortir en choisissant une carte à défausser. Les autres joueurs jouent alors un dernier tour.",
  "rules.scoringTitle": "Calcul des points",
  "rules.scoring":
    "Les cartes placées dans des combinaisons valent 0. Seules les cartes restantes sont comptées : leur valeur faciale, 11 pour un Valet, 12 pour une Dame, 13 pour un Roi, 20 pour une carte folle et 50 pour un Joker.",
  "lobby.leave": "Quitter la salle",
  "lobby.privateRoom": "Salle privée",
  "lobby.title": "La table se remplit",
  "lobby.copyCode": "Copier le code",
  "lobby.shareText": "Rejoins ma partie de Cinq Royaumes avec le code {code}.",
  "lobby.share": "Partager la partie",
  "lobby.linkCopied": "Lien copié",
  "lobby.linkCopiedStatus": "Le lien d’invitation est copié.",
  "lobby.you": "toi",
  "lobby.host": "Hôte",
  "lobby.ready": "Prêt",
  "lobby.waitingPlayer": "En attente d’un joueur…",
  "lobby.start": "Lancer la partie",
  "lobby.hostWillStart": "L’hôte lancera la partie.",
  "game.scores": "Scores",
  "game.finished": "Partie terminée",
  "game.winner": "{name} remporte la couronne",
  "game.points": "{count} pts",
  "game.home": "Retour à l’accueil",
  "game.round": "Manche",
  "game.wild": "Folle : {rank}",
  "game.room": "Salle {code}",
  "game.leave": "Quitter",
  "game.cards": "{count} cartes",
  "game.away": "Absent",
  "game.paused": "Partie en pause",
  "game.wentOutSelf": "{name} est sorti · bravo !",
  "game.wentOutOther": "{name} est sorti ! Dernier tour",
  "game.yourTurn": "À toi de jouer",
  "game.playerTurn": "Tour de {name}",
  "game.playerReveals": "{name} sort ses cartes",
  "game.aPlayer": "Un joueur",
  "game.book": "Livre",
  "game.run": "Suite",
  "game.draw": "Piocher",
  "game.empty": "Vide",
  "game.discardPile": "Défausse",
  "game.yourHand": "Ta main",
  "game.directReady": "Ta main est complète : tu peux sortir sans piocher",
  "game.drawCard": "Pioche une carte",
  "game.ready": "Ta main est valide : tu peux sortir",
  "game.selectDiscard": "Clique la carte que tu veux défausser",
  "game.goOutReady": "Sortie prête",
  "game.discard": "Défausser",
  "game.goOut": "Sortir maintenant",
  "card.joker": "Joker",
  "suit.stars": "étoiles",
  "suit.hearts": "cœurs",
  "suit.clubs": "trèfles",
  "suit.spades": "piques",
  "suit.diamonds": "carreaux",
  "error.GAME_STARTED": "La partie a déjà commencé.",
  "error.ROOM_FULL": "Cette salle est complète.",
  "error.NAME_TAKEN": "Ce pseudo est déjà utilisé dans la salle.",
  "error.SESSION_EXPIRED": "Cette session n’existe plus.",
  "error.NOT_IN_ROOM": "Vous n’êtes pas dans une salle.",
  "error.PLAYER_NOT_FOUND": "Joueur introuvable.",
  "error.HOST_ONLY": "Seul l’hôte peut lancer la partie.",
  "error.NOT_ENOUGH_PLAYERS": "Il faut au moins deux joueurs.",
  "error.INVALID_PHASE": "Cette action n’est pas disponible maintenant.",
  "error.EMPTY_DISCARD": "La défausse est vide.",
  "error.EMPTY_DECK": "La pioche est vide.",
  "error.DISCARD_REQUIRED": "Choisissez une carte à défausser avant de sortir.",
  "error.INVALID_DISCARD": "Aucune défausse n’est nécessaire avant la pioche.",
  "error.CARD_NOT_FOUND": "Cette carte n’est pas dans votre main.",
  "error.INVALID_MELDS": "Les groupes ne couvrent pas une main valide.",
  "error.GAME_PAUSED": "La partie attend un joueur déconnecté.",
  "error.NOT_YOUR_TURN": "Ce n’est pas votre tour.",
  "error.DUPLICATE_ACTION": "Cette action a déjà été traitée.",
  "error.ROOM_NOT_FOUND": "Salle introuvable.",
  "error.INVALID_INPUT": "Les données envoyées sont invalides.",
  "error.INTERNAL_ERROR": "Une erreur interne est survenue.",
} as const;

export type TranslationKey = keyof typeof fr;
const es: Record<TranslationKey, string> = {
  "language.label": "Idioma",
  "brand.name": "Cinco Reinos",
  "meta.description": "Únete a una partida privada de Cinco Reinos, el juego de rummy en línea para 2 a 7 jugadores.",
  "meta.socialDescription": "Únete a una partida privada de Cinco Reinos con tus amigos.",
  "home.tagline": "Juego de rummy en línea",
  "home.description": "Once rondas. Cinco palos. Una sola corona para la puntuación más baja.",
  "home.privateGame": "Partida privada",
  "home.title": "Toma asiento en la mesa",
  "home.nickname": "Tu apodo",
  "home.nicknamePlaceholder": "Ej. Camila",
  "home.create": "Crear una sala",
  "home.orJoin": "o unirse",
  "home.roomCode": "Código de sala",
  "home.join": "Unirse",
  "home.privacy": "De 2 a 7 jugadores, sin cuenta",
  "rules.open": "Reglas del juego",
  "rules.close": "Cerrar las reglas",
  "rules.goalTitle": "Objetivo del juego",
  "rules.goal":
    "Forma libros y escaleras para conservar la menor cantidad de puntos posible. Después de las once rondas, gana quien tenga la puntuación total más baja.",
  "rules.roundsTitle": "Las once rondas",
  "rules.rounds":
    "La primera ronda se juega con 3 cartas y los 3 son comodines. Cada ronda añade una carta y avanza el valor comodín, hasta la última ronda con 13 cartas y los Reyes como comodines.",
  "rules.turnTitle": "En tu turno",
  "rules.turnDraw": "Roba la primera carta del mazo o de la pila de descarte.",
  "rules.turnArrange": "Ordena tu mano para preparar tus combinaciones.",
  "rules.turnDiscard": "Descarta una carta para terminar tu turno.",
  "rules.meldsTitle": "Combinaciones válidas",
  "rules.bookLabel": "Libro:",
  "rules.book": "al menos 3 cartas del mismo valor, sin importar sus palos.",
  "rules.runLabel": "Escalera:",
  "rules.run": "al menos 3 cartas consecutivas del mismo palo.",
  "rules.wild": "Los Jokers y todas las cartas del valor comodín de la ronda pueden sustituir una carta que falte.",
  "rules.goOutTitle": "Cerrar",
  "rules.goOut":
    "Si toda tu mano forma combinaciones, puedes cerrar inmediatamente sin robar. Después de robar, también puedes cerrar eligiendo una carta para descartar. Los demás jugadores juegan entonces un último turno.",
  "rules.scoringTitle": "Cálculo de puntos",
  "rules.scoring":
    "Las cartas incluidas en combinaciones valen 0. Solo se cuentan las cartas restantes: su valor nominal, 11 para una Jota, 12 para una Reina, 13 para un Rey, 20 para un comodín de ronda y 50 para un Joker.",
  "lobby.leave": "Salir de la sala",
  "lobby.privateRoom": "Sala privada",
  "lobby.title": "La mesa se está llenando",
  "lobby.copyCode": "Copiar el código",
  "lobby.shareText": "Únete a mi partida de Cinco Reinos con el código {code}.",
  "lobby.share": "Compartir la partida",
  "lobby.linkCopied": "Enlace copiado",
  "lobby.linkCopiedStatus": "El enlace de invitación se ha copiado.",
  "lobby.you": "tú",
  "lobby.host": "Anfitrión",
  "lobby.ready": "Listo",
  "lobby.waitingPlayer": "Esperando a otro jugador…",
  "lobby.start": "Empezar la partida",
  "lobby.hostWillStart": "El anfitrión empezará la partida.",
  "game.scores": "Puntuaciones",
  "game.finished": "Partida terminada",
  "game.winner": "{name} gana la corona",
  "game.points": "{count} pts",
  "game.home": "Volver al inicio",
  "game.round": "Ronda",
  "game.wild": "Comodín: {rank}",
  "game.room": "Sala {code}",
  "game.leave": "Salir",
  "game.cards": "{count} cartas",
  "game.away": "Ausente",
  "game.paused": "Partida en pausa",
  "game.wentOutSelf": "¡{name} ha cerrado · bien hecho!",
  "game.wentOutOther": "¡{name} ha cerrado! Último turno",
  "game.yourTurn": "Tu turno",
  "game.playerTurn": "Turno de {name}",
  "game.playerReveals": "{name} muestra sus cartas",
  "game.aPlayer": "Un jugador",
  "game.book": "Libro",
  "game.run": "Escalera",
  "game.draw": "Robar",
  "game.empty": "Vacío",
  "game.discardPile": "Descarte",
  "game.yourHand": "Tu mano",
  "game.directReady": "Tu mano está completa: puedes cerrar sin robar",
  "game.drawCard": "Roba una carta",
  "game.ready": "Tu mano es válida: puedes cerrar",
  "game.selectDiscard": "Elige la carta que quieres descartar",
  "game.goOutReady": "Cierre preparado",
  "game.discard": "Descartar",
  "game.goOut": "Cerrar ahora",
  "card.joker": "Joker",
  "suit.stars": "estrellas",
  "suit.hearts": "corazones",
  "suit.clubs": "tréboles",
  "suit.spades": "picas",
  "suit.diamonds": "diamantes",
  "error.GAME_STARTED": "La partida ya ha comenzado.",
  "error.ROOM_FULL": "Esta sala está completa.",
  "error.NAME_TAKEN": "Este apodo ya se usa en la sala.",
  "error.SESSION_EXPIRED": "Esta sesión ya no existe.",
  "error.NOT_IN_ROOM": "No estás en ninguna sala.",
  "error.PLAYER_NOT_FOUND": "Jugador no encontrado.",
  "error.HOST_ONLY": "Solo el anfitrión puede empezar la partida.",
  "error.NOT_ENOUGH_PLAYERS": "Se necesitan al menos dos jugadores.",
  "error.INVALID_PHASE": "Esta acción no está disponible ahora.",
  "error.EMPTY_DISCARD": "La pila de descarte está vacía.",
  "error.EMPTY_DECK": "El mazo está vacío.",
  "error.DISCARD_REQUIRED": "Elige una carta para descartar antes de cerrar.",
  "error.INVALID_DISCARD": "No necesitas descartar antes de robar.",
  "error.CARD_NOT_FOUND": "Esta carta no está en tu mano.",
  "error.INVALID_MELDS": "Las combinaciones no cubren una mano válida.",
  "error.GAME_PAUSED": "La partida espera a un jugador desconectado.",
  "error.NOT_YOUR_TURN": "No es tu turno.",
  "error.DUPLICATE_ACTION": "Esta acción ya se ha procesado.",
  "error.ROOM_NOT_FOUND": "Sala no encontrada.",
  "error.INVALID_INPUT": "Los datos enviados no son válidos.",
  "error.INTERNAL_ERROR": "Se ha producido un error interno.",
};

const translations: Record<Language, Record<TranslationKey, string>> = { fr, es };
const languageStorageKey = "cinq-royaumes-language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(languageStorageKey);
    if (stored === "fr" || stored === "es") return stored;
    return navigator.language.toLowerCase().startsWith("es") ? "es" : "fr";
  });

  useEffect(() => {
    localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language;
    document.title = translations[language]["brand.name"];
    const metadata: Record<string, string> = {
      'meta[name="description"]': translations[language]["meta.description"],
      'meta[property="og:locale"]': language === "fr" ? "fr_FR" : "es_ES",
      'meta[property="og:title"]': translations[language]["brand.name"],
      'meta[property="og:description"]': translations[language]["meta.socialDescription"],
      'meta[name="twitter:title"]': translations[language]["brand.name"],
      'meta[name="twitter:description"]': translations[language]["meta.socialDescription"],
    };
    Object.entries(metadata).forEach(([selector, content]) => document.querySelector(selector)?.setAttribute("content", content));
  }, [language]);

  const t = (key: TranslationKey, values: TranslationValues = {}) =>
    Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), translations[language][key]);

  const errorMessage = (code: string, fallback: string) => {
    const key = `error.${code}` as TranslationKey;
    return key in translations[language] ? translations[language][key] : fallback;
  };

  return <I18nContext.Provider value={{ language, setLanguage, t, errorMessage }}>{children}</I18nContext.Provider>;
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className="language-switcher" role="group" aria-label={t("language.label")}>
      <button type="button" className={language === "fr" ? "active" : ""} aria-pressed={language === "fr"} onClick={() => setLanguage("fr")}>
        FR
      </button>
      <button type="button" className={language === "es" ? "active" : ""} aria-pressed={language === "es"} onClick={() => setLanguage("es")}>
        ES
      </button>
    </div>
  );
}
