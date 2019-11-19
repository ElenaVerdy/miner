ttsbegin;

CREATE TABLE users (
    id                  serial primary key,
    username        	varchar(50) NOT NULL,
    email        	    varchar(355) NOT NULL,    
    rank                integer DEFAULT 2100,
    access_token        varchar(32),

    UNIQUE(username),
    UNIQUE(email)
);

CREATE INDEX email_idx ON users (email);

INSERT INTO users (username, email) values ('Guest', 'MinesSlayer');

CREATE TABLE passwords (
    id                  integer primary key references users(id),
    st                  varchar(50),
    fh                  varchar(355)
);

CREATE TYPE gametype AS ENUM ('easy', 'medium', 'hard');

CREATE TABLE recordssingleplayer (
    gameid              serial primary key,
    timems              integer NOT NULL,
    gametype            gametype NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT Now(),
    playerusername      varchar(50) references users(username) NOT NULL
);
CREATE INDEX recordssingleplayer_timems_idx ON recordssingleplayer (timems);

CREATE TABLE recordstwoplayers (
    gameid                  serial primary key,
    timems                  integer NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT Now(),
    player1username        	varchar(50) references users(username) NOT NULL,
    player2username        	varchar(50) references users(username) NOT NULL    
);

CREATE INDEX recordstwoplayers_timems_idx ON recordstwoplayers (timems);

ttsCommit;