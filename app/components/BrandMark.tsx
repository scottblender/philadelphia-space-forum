import Image from "next/image";
import { publicAsset } from "../lib/publicAsset";

export function BrandMark() {
  return <Image className="brand-mark" src={publicAsset("/psf-mark.svg")} alt="" aria-hidden="true" width={44} height={31} unoptimized />;
}
