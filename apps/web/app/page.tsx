export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-16 sm:px-10"
    >
      <p className="text-sm font-semibold tracking-wide">Narra</p>
      <h1 className="mt-6 max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        Turn raw datasets into understandable dashboards.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
        A clearer way to explore your data. Coming soon.
      </p>
    </main>
  );
}
