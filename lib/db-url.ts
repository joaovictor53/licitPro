/**
 * Resolve qual string de conexão usar.
 *
 * Na Railway, o banco é alcançado pelo hostname privado
 * (`postgres.railway.internal`), que só resolve de dentro da rede da Railway.
 * Fora dela — `next dev` na máquina do dev, drizzle-kit, scripts — é preciso
 * usar o proxy TCP público (`DATABASE_PUBLIC_URL`, tipo `*.proxy.rlwy.net`).
 *
 * A detecção usa `RAILWAY_ENVIRONMENT`, injetada automaticamente pela Railway
 * em todo serviço que ela executa.
 */
export function resolverUrlBanco(): string {
    const naRailway = Boolean(process.env.RAILWAY_ENVIRONMENT);
    // `||` e não `??`: a variável ausente costuma vir como string vazia (linha
    // `DATABASE_PUBLIC_URL=` no .env), que precisa cair no fallback.
    const interna = process.env.DATABASE_URL?.trim();
    const publica = process.env.DATABASE_PUBLIC_URL?.trim();

    const url = naRailway ? (interna || publica) : (publica || interna);

    if (!url) {
        throw new Error(
            'DATABASE_URL não está definida. Configure a variável de ambiente ' +
            '(localmente no .env; em produção, no painel da Railway).'
        );
    }

    if (!naRailway && url.includes('.railway.internal')) {
        throw new Error(
            'A conexão aponta para o hostname privado da Railway ' +
            '(*.railway.internal), que só resolve de dentro da rede da Railway. ' +
            'Para rodar localmente, defina DATABASE_PUBLIC_URL no .env com o valor ' +
            'de DATABASE_PUBLIC_URL do serviço Postgres (painel da Railway > ' +
            'Postgres > Variables) — o host termina em .proxy.rlwy.net.'
        );
    }

    return url;
}
