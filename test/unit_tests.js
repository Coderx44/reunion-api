const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;
const app = require('../index');
const sinon = require('sinon');
const db = require('../db')
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


describe('POST /follow/:id', () => {
  let dbStub;
  beforeEach(() => {
    dbStub = sinon.stub(db, 'query');
  });
  afterEach(() => {
    dbStub.restore();
  });

  it('should return an error if user tries to follow themself', async () => {
    const user = {
      id: 1,
      email: 'johndoe@example.com'
    };
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJqb2huZG9lQGV4YW1wbGUuY29tIiwiaWF0IjoxNjc5MjA2NTExfQ.TrpQCK5W1jWQbx5G9kYC4qrH7nxGL1wto-Ugz-obIiI';
    const followerId = 1;
    const followingId = 1;

    dbStub.withArgs('SELECT * FROM users WHERE id = $1', [followerId]).resolves({
      rows: [{ id: followerId, email: user.email }]
    });
    dbStub.withArgs('SELECT * FROM users WHERE id = $1', [followingId]).resolves({
      rows: [{ id: followingId }]
    });

    const res = await chai
      .request(app)
      .post(`/api/follow/${followingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res).to.have.status(400);
    expect(res.body).to.have.property('error').to.equal('You cannot follow yourself.');
  });



  it('should return an error if user is already following the target user', async () => {
    const user = {
      id: 1,
      email: 'test@example.com'
    };
    const token = 'test-token';
    const followerId = 1;
    const followingId = 2;

    dbStub.withArgs('SELECT * FROM users WHERE id = $1', [followerId]).resolves({
      rows: [{ id: followerId, email: user.email }]
    });
    dbStub.withArgs('SELECT * FROM users WHERE id = $1', [followingId]).resolves({
      rows: [{ id: followingId }]
    });
    dbStub.withArgs('SELECT * FROM following WHERE follower_id = $1 AND following_id = $2', [
      followerId,
      followingId
    ]).resolves({
      rows: [{ id: 1 }]
    });
  });
});



describe('GET /api/posts/:id', () => {
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

  it('should return a post with likes and comments count', (done) => {
    authenticatedUser
      .get('/api/posts/1')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('id');
        expect(res.body).to.have.property('title');
        expect(res.body).to.have.property('description');
        expect(res.body).to.have.property('created_at');
        expect(res.body).to.have.property('likes');
        expect(res.body).to.have.property('comments');
        done();
      });
  });



  it('should return 404 if post is not found', (done) => {
    authenticatedUser
      .get('/api/posts/999')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(404);
        done();
      });
  });
});

describe('GET /all_posts', () => {
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

  it('should return all posts for authenticated user', (done) => {
    authenticatedUser
      .get('/api/all_posts')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('array');
        done();
      });
  });


  it('should return 403 if token is invalid', (done) => {
    chai.request(app)
      .get('/api/all_posts')
      .set('Authorization', 'Bearer invalidtoken')
      .end((err, res) => {
        expect(res).to.have.status(403);
        done();
      });
  });
});

