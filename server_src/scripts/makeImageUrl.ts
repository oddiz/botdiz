export function makeImageUrl (
    guildID: string,
    hash: string | null | undefined,
    { format = 'webp', size } = { size: 128 }
) {

    const root = 'https://cdn.discordapp.com';
    if (hash) {
        return `${root}/icons/${guildID}/${hash}.${format}${
            size ? `?size=${size}` : ''
        }`;
    } else {
        return 'https://discord.com/assets/f9bb9c4af2b9c32a2c5ee0014661546d.png';
    }
}