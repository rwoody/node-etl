const etl = require('../index');
const pg = require('pg');
const data = require('./data');
const QueryStream = require('pg-query-stream');
const t = require('tap');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'circle_test',
  user: 'ubuntu'
});

const p = etl.postgres.execute(pool);

const before = p.query('CREATE SCHEMA circle_test')
  .catch(Object)
  .then(() => p.query('DROP TABLE IF EXISTS test;'))  
  .then(()  => p.query(
    'CREATE TABLE test ('+
    'name varchar(45),'+
    'age integer,'+
    'dt date '+
    ')'
  ));
 
t.test('postgres', async t => {
  await before;
  t.test('inserts', async t => {
    const d = await data.stream()
      .pipe(etl.postgres.upsert(pool,'circle_test','test',{pushResult:true}))
      .promise();

    t.same(d.length,3,'returns correct length');
  });

  t.test('and records are verified',async t => {
    const expected = data.data.map(d => ({
      name : d.name,
      age : d.age,
      dt : d.dt
    }))
    .sort((a,b) => a.age - b.age);

    const d = await p.query('SELECT * from test order by age');
    t.same(d.rows,expected,'records verified');
  });

  t.test('streaming', async t => {
    const d = await p.stream(new QueryStream('select * from test'))
      .pipe(etl.map())
      .promise();

    t.same(d.length,3,'work');
  });
})
.catch(console.log)
.then(() => pool.end());