import { Request, Response } from "express";
import { PostureService } from "../services/PostureService";

export class PostureController {
  private service: PostureService;

  constructor() {
    this.service = new PostureService();
  }

  check(req: Request, res: Response) {
    const report = req.body;
    const result = this.service.evaluate(report);
    return res.json(result);
  }

  report(_req: Request, res: Response) {
    return res.json(this.service.getAll());
  }
}
