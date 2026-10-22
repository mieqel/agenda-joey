/** Fout met een nette melding voor de gebruiker (wordt een JSON-antwoord met deze status). */
export class ChangeError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
