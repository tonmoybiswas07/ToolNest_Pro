export const socialPlatforms = {
  instagram: {
    label: "Instagram",
    hosts: ["instagram.com", "www.instagram.com"],
    postPath: /^\/(?:reels?|p|tv)\/[\w-]+\/?$/,
    help: "Open a Reel in Instagram and look for Download in the share menu. Your own videos may also be available through Accounts Center.",
  },
  tiktok: {
    label: "TikTok",
    hosts: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"],
    postPath: /^\/(?:@[\w.-]+\/video\/\d+|t\/[\w-]+)\/?$/,
    help: "Open the video in TikTok, tap Share, then Save video if the creator allows downloads.",
  },
  threads: {
    label: "Threads",
    hosts: ["threads.com", "www.threads.com", "threads.net", "www.threads.net"],
    postPath: /^\/(?:@[\w.-]+\/)?post\/[\w-]+\/?$/,
    help: "For your own posts, look for Export your information in Accounts Center.",
  },
};

export type SocialPlatform = keyof typeof socialPlatforms;

export function socialPostUrl(platform: SocialPlatform, value: string) {
  try {
    const url = new URL(value.trim());
    const { hosts, postPath } = socialPlatforms[platform];
    const shortTikTok = platform === "tiktok" && ["vm.tiktok.com", "vt.tiktok.com"].includes(url.hostname);
    const pathMatches = shortTikTok ? /^\/[\w-]+\/?$/.test(url.pathname) : postPath.test(url.pathname);
    if (url.protocol !== "https:" || url.port || url.username || url.password ||
        !hosts.includes(url.hostname) || !pathMatches) return null;
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}
