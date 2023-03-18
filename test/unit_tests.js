const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const app = require('../index');

chai.use(chaiHttp);

describe('GET /api/user', () => {
  let authenticatedUser = chai.request.agent(app);
  let token;

  before((done) => {
    // Login and get token for authentication
    authenticatedUser
      .post('/api/authenticate')
      .send({ email: 'johndoe@example.com', password: 'password1' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        token = res.body.token;
        done();
      });
  });

  it('should return user profile and follower/following counts', (done) => {
    authenticatedUser
      .get('/api/user')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('name');
        expect(res.body).to.have.property('email');
        expect(res.body).to.have.property('followers');
        expect(res.body).to.have.property('followings');
        done();
      });
  });

  it('should return 401 if token is not provided', (done) => {
    chai.request(app)
      .get('/api/user')
      .end((err, res) => {
        expect(res).to.have.status(401);
        done();
      });
  });

  it('should return 403 if token is invalid', (done) => {
    chai.request(app)
      .get('/api/user')
      .set('Authorization', 'Bearer invalidtoken')
      .end((err, res) => {
        expect(res).to.have.status(403);
        done();
      });
  });
});



describe('POST /api/authenticate', () => {
  it('should return a JWT token when provided with correct credentials', async () => {
    const res = await chai.request(app)
      .post('/api/authenticate')
      .send({ email: 'johndoe@example.com', password: 'password1' });

    expect(res).to.have.status(200);
    expect(res.body).to.have.property('token');
  });

  it('should return 401 Unauthorized when provided with incorrect credentials', async () => {
    const res = await chai.request(app)
      .post('/api/authenticate')
      .send({ email: 'johndoe@example.com', password: 'wrongpassword' });

    expect(res).to.have.status(401);
    expect(res.body).to.have.property('error', 'Invalid email or password');
  });

  it('should return 401 Unauthorized when provided with non-existent email', async () => {
    const res = await chai.request(app)
      .post('/api/authenticate')
      .send({ email: 'nonexistent@example.com', password: 'testpassword' });

    expect(res).to.have.status(401);
    expect(res.body).to.have.property('error', 'Invalid email or password');
  });
});

