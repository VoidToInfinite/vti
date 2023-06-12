import { v4 as uuidv4 } from "uuid";

const generateUUID = (defaultUUID: boolean): string => {
  const newUUID = defaultUUID
    ? uuidv4()
    : uuidv4().replace(/(-|undefined)+/g, "");
  return newUUID;
};

export default generateUUID;
