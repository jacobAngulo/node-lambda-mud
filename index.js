const server = require("./server");

port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`server running on ${port}`);
});
