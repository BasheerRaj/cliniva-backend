/**
 * ProcessedSession
 *
 * Represents a session after full validation and normalization:
 *  - _id is always assigned (auto-generated ObjectId string)
 *  - name is always set (provided or auto-generated as "Session {order}")
 *  - duration is always resolved (explicit value or inherited from service default)
 *  - order is the provided positive integer
 *
 * Used as the canonical session shape stored in Service.sessions[].
 */
export interface ProcessedSession {
  _id: string;
  name: string;
  duration: number;
  order: number;
}
