const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

function buildSupabaseCompat(tableName) {
  return {
    _table: tableName,
    _filters: [],
    _selectCols: '*',
    _orderCol: null,
    _orderAsc: true,
    _limitVal: null,
    _inFilters: [],
    _isCount: false,
    _isHead: false,
    _isMaybeSingle: false,
    _isSingle: false,
    _upsertConflict: null,

    select(cols, opts) {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      if (opts && opts.count === 'exact') {
        b._isCount = true;
      }
      if (opts && opts.head) {
        b._isHead = true;
      }
      b._selectCols = cols || '*';
      return b;
    },

    eq(col, val) {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      b._filters = [...b._filters, { type: 'eq', col, val }];
      return b;
    },

    in(col, vals) {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      b._inFilters = [...b._inFilters, { col, vals }];
      return b;
    },

    gte(col, val) {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      b._filters = [...b._filters, { type: 'gte', col, val }];
      return b;
    },

    order(col, opts) {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      b._orderCol = col;
      b._orderAsc = opts ? opts.ascending !== false : true;
      return b;
    },

    limit(n) {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      b._limitVal = n;
      return b;
    },

    single() {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      b._isSingle = true;
      return b._execute();
    },

    maybeSingle() {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      b._isMaybeSingle = true;
      return b._execute();
    },

    then(resolve, reject) {
      return this._execute().then(resolve, reject);
    },

    async _execute() {
      try {
        if (this._isCount && this._isHead) {
          let whereClause = '';
          const params = [];
          const conditions = this._buildConditions(params);
          if (conditions.length > 0) {
            whereClause = ' WHERE ' + conditions.join(' AND ');
          }
          const sql = `SELECT COUNT(*) FROM "${this._table}"${whereClause}`;
          const res = await query(sql, params);
          return { count: parseInt(res.rows[0].count, 10), data: null, error: null };
        }

        const cols = this._resolveSelectCols(this._selectCols);
        const params = [];
        const conditions = this._buildConditions(params);
        let whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
        let orderClause = this._orderCol ? ` ORDER BY "${this._orderCol}" ${this._orderAsc ? 'ASC' : 'DESC'}` : '';
        let limitClause = this._limitVal ? ` LIMIT ${this._limitVal}` : '';

        const sql = `SELECT ${cols} FROM "${this._table}"${whereClause}${orderClause}${limitClause}`;
        const res = await query(sql, params);

        if (this._isSingle) {
          if (res.rows.length === 0) return { data: null, error: { message: 'No rows found' } };
          return { data: this._processRow(res.rows[0]), error: null };
        }
        if (this._isMaybeSingle) {
          if (res.rows.length === 0) return { data: null, error: null };
          return { data: this._processRow(res.rows[0]), error: null };
        }
        if (this._isCount) {
          return { count: res.rows.length, data: res.rows.map(r => this._processRow(r)), error: null };
        }

        return { data: res.rows.map(r => this._processRow(r)), error: null };
      } catch (err) {
        console.error(`DB error on ${this._table}:`, err.message);
        return { data: null, error: err };
      }
    },

    _buildConditions(params) {
      const conditions = [];
      for (const f of this._filters) {
        params.push(f.val);
        if (f.type === 'eq') {
          conditions.push(`"${f.col}" = $${params.length}`);
        } else if (f.type === 'gte') {
          conditions.push(`"${f.col}" >= $${params.length}`);
        }
      }
      for (const inf of this._inFilters) {
        if (inf.vals.length === 0) {
          conditions.push('FALSE');
        } else {
          const placeholders = inf.vals.map((v, i) => {
            params.push(v);
            return `$${params.length}`;
          });
          conditions.push(`"${inf.col}" IN (${placeholders.join(',')})`);
        }
      }
      return conditions;
    },

    _resolveSelectCols(cols) {
      if (!cols || cols === '*') return '*';
      const parts = cols.split(',').map(c => c.trim());
      const resolved = [];
      for (const part of parts) {
        if (part.includes('(')) {
          const match = part.match(/^(\w+)\((.+)\)$/);
          if (match) {
            resolved.push(`'${match[1]}' as _rel_hint_${match[1]}`);
          }
        } else {
          resolved.push(`"${this._table}"."${part}"`);
        }
      }
      return resolved.length > 0 ? resolved.join(', ') : '*';
    },

    _processRow(row) {
      return row;
    },
  };
}

function buildInsertCompat(tableName, data) {
  return {
    _table: tableName,
    _data: Array.isArray(data) ? data : [data],
    _returning: null,
    _isSingle: false,
    _conflictCol: null,
    _updateOnConflict: false,

    select(cols) {
      const b = Object.assign({}, this, { _data: [...this._data] });
      b._returning = cols || '*';
      return b;
    },

    single() {
      const b = Object.assign({}, this, { _data: [...this._data] });
      b._isSingle = true;
      return b._execute();
    },

    then(resolve, reject) {
      return this._execute().then(resolve, reject);
    },

    async _execute() {
      try {
        const item = this._data[0];
        const keys = Object.keys(item);
        const values = keys.map(k => item[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`);
        const cols = keys.map(k => `"${k}"`);

        let sql;
        if (this._updateOnConflict && this._conflictCol) {
          const updateCols = keys.filter(k => k !== this._conflictCol);
          const updateSet = updateCols.map((k, i) => `"${k}" = EXCLUDED."${k}"`).join(', ');
          sql = `INSERT INTO "${this._table}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
            ON CONFLICT ("${this._conflictCol}") DO UPDATE SET ${updateSet}
            RETURNING *`;
        } else {
          sql = `INSERT INTO "${this._table}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        }

        const res = await query(sql, values);
        if (this._isSingle || this._returning) {
          const row = res.rows[0];
          if (this._isSingle) return { data: row, error: null };
          return { data: res.rows, error: null };
        }
        return { data: res.rows, error: null };
      } catch (err) {
        console.error(`DB insert error on ${this._table}:`, err.message);
        return { data: null, error: err };
      }
    },
  };
}

function buildUpsertCompat(tableName, data, opts) {
  const conflictCol = opts && opts.onConflict ? opts.onConflict : 'id';
  const b = buildInsertCompat(tableName, data);
  b._conflictCol = conflictCol;
  b._updateOnConflict = true;
  return b;
}

function buildUpdateCompat(tableName, data) {
  return {
    _table: tableName,
    _data: data,
    _filters: [],
    _inFilters: [],
    _returning: null,

    eq(col, val) {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      b._filters = [...b._filters, { type: 'eq', col, val }];
      return b;
    },

    select(cols) {
      const b = Object.assign({}, this, { _filters: [...this._filters], _inFilters: [...this._inFilters] });
      b._returning = cols || '*';
      return b;
    },

    then(resolve, reject) {
      return this._execute().then(resolve, reject);
    },

    async _execute() {
      try {
        const keys = Object.keys(this._data);
        const params = keys.map(k => this._data[k]);
        const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);

        const conditions = [];
        for (const f of this._filters) {
          params.push(f.val);
          conditions.push(`"${f.col}" = $${params.length}`);
        }

        let whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
        const returning = this._returning ? ` RETURNING ${this._returning === '*' ? '*' : this._returning.split(',').map(c => `"${c.trim()}"`).join(', ')}` : ' RETURNING *';

        const sql = `UPDATE "${this._table}" SET ${setClauses.join(', ')}${whereClause}${returning}`;
        const res = await query(sql, params);
        return { data: res.rows, error: null };
      } catch (err) {
        console.error(`DB update error on ${this._table}:`, err.message);
        return { data: null, error: err };
      }
    },
  };
}

function buildDeleteCompat(tableName) {
  return {
    _table: tableName,
    _filters: [],

    eq(col, val) {
      const b = Object.assign({}, this, { _filters: [...this._filters] });
      b._filters = [...b._filters, { type: 'eq', col, val }];
      return b;
    },

    then(resolve, reject) {
      return this._execute().then(resolve, reject);
    },

    async _execute() {
      try {
        const params = [];
        const conditions = this._filters.map(f => {
          params.push(f.val);
          return `"${f.col}" = $${params.length}`;
        });
        let whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
        const sql = `DELETE FROM "${this._table}"${whereClause}`;
        await query(sql, params);
        return { error: null };
      } catch (err) {
        console.error(`DB delete error on ${this._table}:`, err.message);
        return { error: err };
      }
    },
  };
}

async function callRpc(fnName, args) {
  try {
    const keys = Object.keys(args);
    const vals = keys.map(k => args[k]);
    const params = keys.map((k, i) => `${k} => $${i + 1}`);
    const sql = `SELECT * FROM ${fnName}(${params.join(', ')})`;
    const res = await query(sql, vals);
    const row = res.rows[0];
    const data = row ? Object.values(row)[0] : null;
    let parsed = data;
    if (typeof data === 'string') {
      try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
    }
    return { data: parsed, error: null };
  } catch (err) {
    console.error(`RPC error ${fnName}:`, err.message);
    return { data: null, error: err };
  }
}

const supabase = {
  from(tableName) {
    return {
      select: (cols, opts) => buildSupabaseCompat(tableName).select(cols, opts),
      insert: (data) => buildInsertCompat(tableName, data),
      upsert: (data, opts) => buildUpsertCompat(tableName, data, opts),
      update: (data) => buildUpdateCompat(tableName, data),
      delete: () => buildDeleteCompat(tableName),
    };
  },
  rpc(fnName, args) {
    return callRpc(fnName, args);
  },
};

const supabasePublic = supabase;

pool.connect()
  .then(client => {
    client.release();
    console.log('✅ PostgreSQL connecté (Replit DB)');
  })
  .catch(err => {
    console.error('❌ Erreur connexion PostgreSQL:', err.message);
  });

module.exports = { supabase, supabasePublic, query, pool };
