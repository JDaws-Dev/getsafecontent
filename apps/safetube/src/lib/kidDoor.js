// Kid door bridge. Inside getsafefamily.com/play this app's kid screens run in
// a same-origin iframe; these messages let the door own the family code (the
// one place a kid types it) and carry the signed-in kid to the next app tab
// with a short-lived kid pass, so switching apps does not mean re-picking a
// name and PIN. Outside a frame they do nothing.
export function tellKidDoor(type, data = {}) {
  try {
    if (window.parent === window) return;
    window.parent.postMessage({ source: 'safefamily-kid', type, ...data }, window.location.origin);
  } catch {
    /* parent gone or cross-origin: nothing to tell */
  }
}

/** The family code did not match a family: the door shows its own code screen. */
export const tellKidDoorBadCode = () => tellKidDoor('bad-code');

/** The current kid's pass (or null when nobody is signed in here any more). */
export const tellKidDoorPass = (token) => tellKidDoor('kid-pass', { token: token || null });
