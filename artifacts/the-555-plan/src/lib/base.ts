export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
export const asset = (name: string) => `${basePath}/${name}`;
