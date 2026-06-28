import { IMAGE_FALLBACK, ytThumb } from "@/lib/images";

/** Spotify track/album ID → i.scdn.co image hash */
const COVER_HASHES: Record<string, string> = {
  "0aMonkh8OKgqx1K0viRHRT": "ab67616d00001e02869b8fb7716ab4d6cbb92679",
  "3LgA6sFAEZ30TqeTWmGDlV": "ab67616d00001e0249ba858c98dd5721233824b2",
  "2Rb5DcNmRKGmMGB48cY8cy": "ab67616d00001e02143dad492c28a44c1e78b8f4",
  "5I5urH7JO7rRAUI4JCodLW": "ab67616d00001e02c4eae66d7f48d3265e36b458",
  "0JmFNORLiAQwtz48DsqeD0": "ab67616d00001e028bc0122685a6779c3b6f583c",
  "4kqqTDRXEJTUcIQHScIitK": "ab67616d00001e028bc0122685a6779c3b6f583c",
  "5dHDxDXEMaRjmf0wHZLBmy": "ab67616d00001e0266ba933a216383e5f943289a",
  "11VfNXFzTxL23ar2XUo695": "ab67616d00001e023fed50e1f1bee2fe78844b99",
  "4NAZVNM9sk0CH6zFw92TJN": "ab67616d00001e024f30a9bdc814f7c4509a813e",
  "0ZG5EiTjLZJRAEr05efBUS": "ab67616d00001e02710450f5dfe9bfcfa54323af",
  "7CzGQZkhxl7TLtZ4VL1uMc": "ab67616d00001e023a2580ec28168f5c28664c7c",
  "6h6qKddRvl9i5YUmvNcHfN": "ab67616d00001e029b68d957159187bf1dfe5fcf",
  "2L6iML8RAAq2Csyd5mA6Ya": "ab67616d00001e02a15ac5cff0e04b9231de4092",
  "7fXK4nSADxslMaAHshrkZI": "ab67616d00001e02c5844ca898304749eb1af102",
  "54wnjcC3dJNRbibmwqAsJB": "ab67616d00001e02c73f7d56297de6c40d90bf9b",
  "5jt1fxz71bodmjOzvtqEV4": "ab67616d00001e021d2507649ad7252827e713dd",
  "13HYthybjhM3iyWcfl8VcN": "ab67616d00001e020c470be4b22b8a8a75223a01",
  "3kGr39dBiUUdFNw6iiLTDV": "ab67616d00001e02e765b62ea6da166d2dc99d4b",
  "50OKS8aOeuiegMnJuPKUeN": "ab67616d00001e020d09df7d3365c73e2e4f1647",
  "1yxK8cFopEVTNp59mtjoex": "ab67616d00001e025c3f9f8f4e08a70790d67705",
  "4qCw12VA1ghMYBH78mWQKE": "ab67616d00001e02ffc82577c594aad2c602b18c",
  "5kcWoHzVA1h6w8Uu4TgmzC": "ab67616d00001e0280743812e1f05886e32568bb",
  "5anpt5Mt1bT5c6wk6cwmu9": "ab67616d00001e02fb6dbebe9d06eb79adb23f5a",
  "3eKCphLVlWBovVgh7veu2l": "ab67616d00001e02419edad5a2525b305ea7935b",
  "4YPGYYa6y7PwZXWmGUuwmK": "ab67616d00001e023e6f906c0e9eff8262cd9888",
  "1FubT3w22RMHC3vreAL7cH": "ab67616d00001e029fae5caa6d6bf5e3da412047",
  "6R84ZlQF7gGkPB6o3GLZXB": "ab67616d00001e024671e0e2f9968238a8e15af8",
  "2Y2Ydnk6XPTe4IpOTNs5Xh": "ab67616d00001e0273c1ca8ad0d925ffad67d9a2",
  "34yR53qn56KlYXmhbuwjaa": "ab67616d00001e02960aad521ba3873752bd016f",
  "2tpfPi4qSamU9EX5Q8FnNi": "ab67616d00001e020c470be4b22b8a8a75223a01",
};

function spotifyId(url: string): string | null {
  const match = url.match(/spotify\.com\/(?:track|album)\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

export function scdn(hash: string): string {
  return `https://i.scdn.co/image/${hash}`;
}

/** Release artwork from Spotify; unique YouTube still or hash as fallback. */
export function trackCover(
  spotifyUrl: string,
  options?: { youtubeId?: string; hash?: string }
): string {
  if (options?.hash) return scdn(options.hash);
  const id = spotifyId(spotifyUrl);
  if (id && COVER_HASHES[id]) return scdn(COVER_HASHES[id]);
  if (options?.youtubeId) return ytThumb(options.youtubeId, "hq");
  return IMAGE_FALLBACK;
}
