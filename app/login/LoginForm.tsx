'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Avatar } from '../components/Avatar';
import { login, type LoginState } from './actions';

type U = { id: string; name: string; roleLabel: string; isOwner: boolean };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn primary" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>
      {pending ? 'Bezig…' : 'Inloggen'}
    </button>
  );
}

export function LoginForm({ users }: { users: U[] }) {
  const [state, action] = useFormState<LoginState, FormData>(login, {});

  // volledige herlaad, zodat de agenda direct met de nieuwe sessie opent
  useEffect(() => {
    if (state?.ok) window.location.replace('/');
  }, [state]);
  return (
    <form action={action} className="form">
      <div className="box">
        <fieldset className="staffpick">
          <legend className="label">Wie ben jij?</legend>
          {users.map((u) => (
            <label key={u.id} className="stile">
              <input type="radio" name="userId" value={u.id} required />
              <Avatar id={u.id} name={u.name} />
              <span>
                <b>{u.name}</b>
                <small>{u.isOwner ? 'Eigenaar agenda' : u.roleLabel}</small>
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="box">
        <label className="field">
          <span className="label">Pincode</span>
          <input
            className="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            autoComplete="off"
            required
            aria-describedby={state?.error ? 'loginErr' : undefined}
          />
        </label>
        {state?.error && (
          <div className="err" id="loginErr" role="alert">
            {state?.error}
          </div>
        )}
        <Submit />
        <span className="hint">Je blijft 12 uur ingelogd. Op een gedeelde computer: log uit als je klaar bent.</span>
      </div>
    </form>
  );
}
