exports.handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const path = event.path || "/";
  switch (event.httpMethod) {
    case "GET":
      if (path === "/health") {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "ok",
            service: "lambda-api-v1",
            timestamp: new Date().toISOString(),
          }),
        };
      }
      return { statusCode: 200, body: JSON.stringify({ message: "GET items" }) };

    case "POST":
      return { statusCode: 201, body: JSON.stringify({ message: "POST item", body: event.body }) };

    case "PUT":
      return { statusCode: 200, body: JSON.stringify({ message: "PUT item", body: event.body }) };

    case "DELETE":
      return { statusCode: 200, body: JSON.stringify({ message: "DELETE item" }) };

    default:
      return { statusCode: 400, body: "Unsupported method" };
  }

  // return {
  //   statusCode: 200,
  //   body: JSON.stringify({ message: "Hello from Lambda (TS)!" }),
  // };
};
