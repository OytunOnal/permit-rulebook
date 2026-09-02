# Zero backend: evaluation runs entirely on the user's device

The site is static; the engine and dataset ship to the browser and all
declarations (citizenship, salary band, age…) live only in browser memory —
no network request ever carries them out, and there is no server, no
telemetry, no cookie banner. We chose this over a conventional backend
because the declarations are sensitive personal data and "your answers never
leave this device" is a positioning line we can make literally true and
verifiable. The accepted consequence: we cannot measure usage (a
privacy-preserving counter is a possible later add), and anything requiring
server state (accounts, saved results) is out of scope by design.
