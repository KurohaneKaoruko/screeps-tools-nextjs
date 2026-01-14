import { ScreepsApi, Shard } from 'screeps-simple-api'

// Server-side wrapper for screeps-simple-api
// This file should ONLY be imported by Next.js API Routes (Server Components/Routes)

export class ScreepsServerApi {
  private api: ScreepsApi

  constructor(token?: string) {
    this.api = new ScreepsApi({ token: token || process.env.SCREEPS_API_TOKEN })
  }

  // Expose the raw api if needed, or wrap methods
  public get raw() {
    return this.api
  }

  async executeConsoleCommand(expression: string, shard: string = 'shard0'): Promise<any> {
    // Shard casting due to loose typing in library vs strict in TS
    return this.api.console(expression, shard as Shard)
  }

  async getMe(): Promise<any> {
    return this.api.getMyInfo()
  }
  
  // You can add other server-side helper methods here if needed
}
