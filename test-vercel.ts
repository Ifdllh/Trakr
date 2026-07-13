import app from './api/server';
import http from 'http';
http.createServer(app).listen(3001, () => {
  console.log("Listening on 3001");
});
