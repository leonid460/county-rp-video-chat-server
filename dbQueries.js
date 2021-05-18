export class DbQueriesContainer {
  constructor(connection) {
    this.connection = connection
  };

  getUser = async (username) => {
    const query = `SELECT * FROM \`User_information\` WHERE User_name = '${username}'`;

    return new Promise((resolve, reject) => {
      this.connection.query(query, (error, results) => {

        if (error) {
          return reject(error);
        }

        const result = results[0];

        if (!result) {
          return resolve(null);
        }

        resolve({
          username: result['User_name'],
          password: result['Password']
        });
      })
    })
  };

  addUser = async (username, password) => {
    const query = `INSERT INTO \`User_information\`(\`User_name\`, \`Password\`) VALUES ('${username}','${password}')`;

    return new Promise((resolve, reject) => {
      this.connection.query(query, (error, results) => {
        if (error) {
          return reject(error);
        }

        return resolve(results);
      })
    });
  }
}
