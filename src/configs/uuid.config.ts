import { V4Options, V1Options } from "uuid";

const uuidConfig: V4Options & V1Options = {
  random: [0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef],
  rng: () => {
    const buffer = new Uint8Array(16);
    window.crypto.getRandomValues(buffer);
    return buffer;
  },
  node: [0x01, 0x23, 0x45, 0x67, 0x89, 0xab],
  clockseq: 0x1234,
  msecs: new Date().getTime(),
  nsecs: 5678,
};

export default uuidConfig;
