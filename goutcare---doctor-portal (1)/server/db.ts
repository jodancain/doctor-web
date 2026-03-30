import { MongoClient, ObjectId } from "mongodb";
import { logger } from "./logger";

const uri = process.env.MONGO_URI;
if (!uri) {
  logger.error("MONGO_URI environment variable is required");
  process.exit(1);
}
const client = new MongoClient(uri);

client.connect().then(() => {
  logger.info("Connected to MongoDB");
}).catch(err => {
  logger.error({ err }, "MongoDB connection error");
});

class DBCommand {
  and(arr: any[]) { return { $and: arr }; }
  or(arr: any[]) { return { $or: arr }; }
  in(arr: any[]) { return { $in: arr }; }
  nin(arr: any[]) { return { $nin: arr }; }
  gt(val: any) { return { $gt: val }; }
  gte(val: any) { return { $gte: val }; }
  lt(val: any) { return { $lt: val }; }
  lte(val: any) { return { $lte: val }; }
  eq(val: any) { return { $eq: val }; }
  neq(val: any) { return { $ne: val }; }
}

export const _ = new DBCommand();

class Collection {
  constructor(
    private name: string, 
    private query: any = {}, 
    private _limit?: number, 
    private _skip?: number, 
    private _orderBy?: any,
    private _field?: any
  ) {}
  
  where(q: any) {
    return new Collection(this.name, { ...this.query, ...q }, this._limit, this._skip, this._orderBy, this._field);
  }
  
  doc(id: any) {
    const idStr = Array.isArray(id) ? id[0] : id;
    let _id: any = idStr;
    if (typeof idStr === 'string' && idStr.length === 24 && /^[0-9a-fA-F]{24}$/.test(idStr)) {
      _id = { $in: [idStr, new ObjectId(idStr)] };
    }
    return new Collection(this.name, { _id }, this._limit, this._skip, this._orderBy, this._field);
  }

  limit(n: number) {
    return new Collection(this.name, this.query, n, this._skip, this._orderBy, this._field);
  }

  skip(n: number) {
    return new Collection(this.name, this.query, this._limit, n, this._orderBy, this._field);
  }

  orderBy(field: string, direction: 'asc'|'desc') {
    const order = { ...this._orderBy, [field]: direction === 'asc' ? 1 : -1 };
    return new Collection(this.name, this.query, this._limit, this._skip, order, this._field);
  }

  field(projection: any) {
    let _field = projection;
    // Cloudbase field API: { a: true, b: false } (actually it's {a:1, b:0} in mongo)
    return new Collection(this.name, this.query, this._limit, this._skip, this._orderBy, _field);
  }

  async get(): Promise<{ data: any[] }> {
    const coll = client.db().collection(this.name);
    let cursor = coll.find(this.query);
    if (this._orderBy) cursor = cursor.sort(this._orderBy);
    if (this._skip) cursor = cursor.skip(this._skip);
    if (this._limit) cursor = cursor.limit(this._limit);
    if (this._field) {
        // Simple mapping, true->1, false->0, etc
        const projection: any = {};
        for (const k in this._field) {
            projection[k] = this._field[k] ? 1 : 0;
        }
        cursor = cursor.project(projection);
    }
    const data = await cursor.toArray();
    // Convert ObjectId to string
    const mappedData = data.map(doc => ({
      ...doc,
      _id: doc._id.toString()
    }));
    return { data: mappedData };
  }

  async count() {
    const coll = client.db().collection(this.name);
    const total = await coll.countDocuments(this.query);
    return { total };
  }

  async add(doc: any) {
    const coll = client.db().collection(this.name);
    const result = await coll.insertOne(doc);
    return { _id: result.insertedId.toString(), id: result.insertedId.toString() };
  }

  async update(updates: any) {
    const coll = client.db().collection(this.name);
    let updateDoc = updates;
    // CloudBase update applies like $set
    if (!updates.$set && !updates.$push && !updates.$pull && !updates.$inc) {
      updateDoc = { $set: updates };
    }
    const result = await coll.updateMany(this.query, updateDoc);
    return { updated: result.modifiedCount };
  }

  async remove() {
    const coll = client.db().collection(this.name);
    const result = await coll.deleteMany(this.query);
    return { deleted: result.deletedCount };
  }

  aggregate() {
    return new AggregateBuilder(this.name);
  }
}

// ===== 聚合管道构建器（模拟 CloudBase aggregate API）=====
class AggregateBuilder {
  private pipeline: any[] = [];
  constructor(private collectionName: string) {}

  match(condition: any) {
    this.pipeline.push({ $match: condition });
    return this;
  }

  sort(order: any) {
    this.pipeline.push({ $sort: order });
    return this;
  }

  group(spec: any) {
    this.pipeline.push({ $group: spec });
    return this;
  }

  replaceRoot(spec: any) {
    this.pipeline.push({ $replaceRoot: spec });
    return this;
  }

  limit(n: number) {
    this.pipeline.push({ $limit: n });
    return this;
  }

  skip(n: number) {
    this.pipeline.push({ $skip: n });
    return this;
  }

  async end(): Promise<{ list: any[] }> {
    const coll = client.db().collection(this.collectionName);
    const list = await coll.aggregate(this.pipeline).toArray();
    // Convert ObjectId to string
    const mapped = list.map(doc => ({
      ...doc,
      _id: doc._id ? doc._id.toString() : doc._id
    }));
    return { list: mapped };
  }
}

// ===== 聚合表达式辅助（模拟 CloudBase $.cond / $.eq / $.first 等）=====
const aggregateExpressions = {
  cond: (spec: any) => ({ $cond: spec }),
  eq: (arr: any) => ({ $eq: arr }),
  neq: (arr: any) => ({ $ne: arr }),
  first: (field: any) => ({ $first: field }),
  last: (field: any) => ({ $last: field }),
  sum: (field: any) => ({ $sum: field }),
  avg: (field: any) => ({ $avg: field }),
  max: (field: any) => ({ $max: field }),
  min: (field: any) => ({ $min: field }),
};

export const db = {
  collection: (name: string) => new Collection(name),
  command: Object.assign(_, { aggregate: aggregateExpressions }),
  serverDate: () => new Date(),
  RegExp: (opts: { regexp: string; options?: string }) => new RegExp(opts.regexp, opts.options)
};
