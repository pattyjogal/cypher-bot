import { ObjectId } from "mongodb";

export default class Member {
  constructor(public gameTag: string, public pronouns: string) {}
}
