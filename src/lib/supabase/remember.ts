// Nom du cookie marqueur (non httpOnly, ne contient aucun secret) qui reflète
// le choix "Se souvenir de moi" du chauffeur. @supabase/ssr écrase toujours
// maxAge/expires avec sa valeur par défaut (~400 jours) à chaque écriture de
// cookie — y compris lors des refresh automatiques côté serveur — donc ce
// marqueur permet à server.ts/middleware.ts de rétablir un cookie de session
// (sans maxAge) à chaque refresh plutôt que de laisser le SDK repartir sur
// son défaut.
export const REMEMBER_COOKIE_NAME = "kfm-remember";
export const REMEMBER_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
