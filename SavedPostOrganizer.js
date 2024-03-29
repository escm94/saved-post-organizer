// TODO: let's remove the need for global vars
let responses = [];
let folders = [];
let posts = [];

window.onload = () => {
  folders = getFoldersFromLocalStorage();
  posts = getPostsFromLocalStorage();

  const allFolder = getAllFolder();
  const pageHigh = pageHighForInitialPage(allFolder.savedPosts.length);
  const lastSynced = getLastSyncedFromLocalStorage();

  populateFoldersArea();
  enablePreviousAndNextButtons();
  configurePreviousAndNextButtons();
  displayPostsFromFolder(allFolder, pageHigh);
  updateLastSyncedValue(lastSynced);
};

const enablePreviousAndNextButtons = () => {
  document.querySelector('#btnPrevious').disabled = false;
  document.querySelector('#btnNext').disabled = false;
};

const pageHighForInitialPage = (numPostsInFolder) => {
  return numPostsInFolder > 25 ? 25 : numPostsInFolder;
};

const getAllFolder = () => {
  return (
    folders.find((folder) => folder.folderName === 'All') ??
    getReinitializedAllFolder()
  );
};

const getFoldersFromLocalStorage = () => {
  return JSON.parse(localStorage.getItem('folders')) ?? [];
};

const getPostsFromLocalStorage = () => {
  return JSON.parse(localStorage.getItem('posts')) ?? [];
};

const getLastSyncedFromLocalStorage = () => {
  return localStorage.getItem('lastSynced') ?? '';
};

const updateLastSyncedValue = (lastsyncedValue) => {
  document.querySelector('#lastSyncedVal').innerHTML = lastsyncedValue;
};

const handleSync = () => {
  clearDataForRefresh();
  const emptiedAllFolder = getReinitializedAllFolder();

  folders.push(emptiedAllFolder);

  fetchPosts();
};

const clearDataForRefresh = () => {
  folders = [];
  posts = [];
  responses = [];
};

const getReinitializedAllFolder = () => {
  const allFolder = {
    folderName: 'All',
    savedPosts: [],
  };
  return allFolder;
};
const fetchPosts = async (afterParamForURL) => {
  try {
    startSyncAnimation();

    const postsPerRequest = 100;
    const maxPostsToFetch = 1000;
    const maxRequests = maxPostsToFetch / postsPerRequest;
    const URL = generateURLStringForFetch(afterParamForURL, postsPerRequest);
    const response = await fetch(URL);
    const responseJSON = await response.json();

    processResponses(responseJSON);

    if (responseJSON.data.after && responses.length < maxRequests) {
      fetchPosts(responseJSON.data.after);
      return;
    }

    addAllPostsToAllFolder();

    updateLocalStorageData();

    displayAll();

    stopSyncAnimation();
  } catch (error) {
    stopSyncAnimation();

    hideDefaultTextInFooter();

    displayLoginMessage();
  }
};

const startSyncAnimation = () => {
  document.querySelector('#btnSync').classList.add('spin');
};

const stopSyncAnimation = () => {
  document.querySelector('#btnSync').classList.remove('spin');
};

const generateURLStringForFetch = (afterParamForURL, postsPerRequest) => {
  const baseURL = 'https://www.reddit.com/saved.json';
  const limitURLParam = `?limit=${postsPerRequest}`;
  const afterURLParam = `${
    afterParamForURL ? '&after=' + afterParamForURL : ''
  }`;
  const wholeURL = `${baseURL}${limitURLParam}${afterURLParam}`;

  return wholeURL;
};

const processResponses = (responseJSON) => {
  responses.push(responseJSON);
  responseJSON.data.children.forEach(processPost);
};

const updateLocalStorageData = () => {
  const tempDate = new Date(Date.now());
  const lastSyncedDate = tempDate.toString().split(' GMT')[0];

  localStorage.setItem('lastSynced', lastSyncedDate);
  localStorage.setItem('folders', JSON.stringify(folders));
  localStorage.setItem('posts', JSON.stringify(posts));
};

const addAllPostsToAllFolder = () => {
  const allFolder = getAllFolder();
  posts.forEach((post) => allFolder.savedPosts.push(post));
};

const hideDefaultTextInFooter = () => {
  document.querySelector('#lblLastSynced').classList.add('hide');
  document.querySelector('#lastSyncedVal').classList.add('hide');
};

const displayLoginMessage = () => {
  const lblLogin = document.querySelector('#lblLogin');
  lblLogin.classList.remove('hide');
  lblLogin.innerHTML =
    "Unable to fetch posts while signed out. <a href='https://reddit.com/login' target='_blank'>Sign in.</a>";
  lblLogin.classList.add('show');
};

const processPost = (savedItem) => {
  const savedItemSubredditName = savedItem.data.subreddit_name_prefixed;

  if (!subredditFolderExists(savedItemSubredditName)) {
    const newFolder = {
      folderName: savedItemSubredditName,
      savedPosts: [],
    };
    folders.push(newFolder);
  }

  const savedPost = {
    id: savedItem.data.name,
  };

  if (savedItemIsAComment(savedItem)) {
    savedPost.link = 'https://reddit.com' + savedItem.data.permalink;
    savedPost.title = savedItem.data.link_title;
  } else {
    savedPost.link = savedItem.data.url;
    savedPost.title = savedItem.data.title;
  }

  addSavedPostToFolderArray(savedItemSubredditName, savedPost);

  if (!postExistsInPostArray(savedPost.id)) {
    addSavedPostToPostsArray(savedPost);
  }
};

const subredditFolderExists = (savedItemSubredditName) => {
  return (
    folders.find((folder) => folder.folderName === savedItemSubredditName) !=
    null
  );
};

const savedItemIsAComment = (savedItem) => {
  return savedItem.data.name.substring(0, 3) === 't1_';
};

const addSavedPostToFolderArray = (folderName, savedPost) => {
  folders
    .find((folder) => folder.folderName === folderName)
    .savedPosts.push(savedPost);
};

const postExistsInPostArray = (postID) => {
  return posts.find((post) => post.id === postID) != null;
};

const addSavedPostToPostsArray = (savedPost) => {
  posts.push(savedPost);
};

const displayAll = () => {
  const allFolder = getAllFolder();
  const pageHigh = pageHighForInitialPage(allFolder.savedPosts.length);
  const lastSynced = getLastSyncedFromLocalStorage();

  updateLastSyncedValue(lastSynced);

  refreshFoldersArea();

  displayPostsFromFolder(allFolder, pageHigh);
};

const refreshFoldersArea = () => {
  clearFoldersArea();
  populateFoldersArea();
  resetFoldersScrollTop();
};

const clearFoldersArea = () => {
  document.querySelector('#folders').innerHTML = '';
};

const populateFoldersArea = () => {
  folders.forEach(generateFolderButton);
};

const resetFoldersScrollTop = () => {
  document.querySelector('#folders').scrollTop = 0;
};

const generateFolderButton = (folder) => {
  const numPostsInFolder = folder?.savedPosts?.length;
  const pageHigh = pageHighForInitialPage(numPostsInFolder);

  const btnFolder = document.createElement('div');
  btnFolder.className = 'folder';
  btnFolder.id = folder.folderName;
  btnFolder.innerHTML = `${folder.folderName}(${numPostsInFolder})`;
  addEventListenerFolderButton(btnFolder, folder, pageHigh);
  addFolderButtonToPage(btnFolder);
};

const addEventListenerFolderButton = (btnFolder, folder, pageHigh) => {
  btnFolder.addEventListener('click', function () {
    enablePreviousAndNextButtons();
    configurePreviousAndNextButtons();
    displayPostsFromFolder(folder, pageHigh);
  });
};

const addFolderButtonToPage = (btnFolder) => {
  document.querySelector('#folders').appendChild(btnFolder);
};

// TODO: continue breaking up later
const displayPostsFromFolder = (folder, currentPageHigh) => {
  const totalPosts = folder?.savedPosts?.length;
  const currentPageLow = currentPageLowValue(totalPosts, currentPageHigh);

  currentPageHigh = currentPageHighValue(currentPageHigh, totalPosts);
  const postsOnPage = folder?.savedPosts?.slice(
    currentPageLow - 1,
    currentPageHigh
  );

  populateLblFolderName(folder.folderName);
  populateLblPages(currentPageLow, currentPageHigh, totalPosts);

  clearPostsArea();
  postsOnPage.forEach(displayPost);
  resetPostsScrollTop();

  setBtnPreviousDisabled(currentPageLow);
  setBtnNextDisabled(currentPageHigh, totalPosts);
  configurePreviousAndNextButtons();

  if (!isBtnPreviousDisabled() && !btnPreviousHasEventHandler())
    document
      .querySelector('#btnPrevious')
      .addEventListener(
        'click',
        btnPreviousOnClick.bind(
          null,
          folder,
          currentPageLow,
          currentPageHigh,
          totalPosts
        )
      ); // TODO: rewrite how we are registering/removing these events. this approach is wrong and unnecessary

  if (!isBtnNextDisabled() && !btnNextHasEventHandler())
    document
      .querySelector('#btnNext')
      .addEventListener(
        'click',
        btnNextOnClick.bind(null, folder, currentPageHigh)
      ); // TODO: rewrite how we are registering/removing these events. this approach is wrong and unnecessary
};

const resetPostsScrollTop = () => {
  document.querySelector('#posts').scrollTop = 0;
};

const clearPostsArea = () => {
  document.querySelector('#posts').innerHTML = '';
};

const populateLblFolderName = (folderName) => {
  const lblFolderName = document.querySelector('#lblFolderName');
  lblFolderName.innerHTML = folderName;
  displayLblFolderName();
};

const displayLblFolderName = () => {
  const lblFolderName = document.querySelector('#lblFolderName');
  lblFolderName.className = 'show';
};

const populateLblPages = (currentPageLow, currentPageHigh, totalPosts) => {
  document.querySelector(
    '#lblPages'
  ).innerHTML = `${currentPageLow}-${currentPageHigh} of ${totalPosts}`;
};

const setBtnPreviousDisabled = (currentPageLow) => {
  document.querySelector('#btnPrevious').disabled =
    currentPageLow > 1 ? false : true;
};

const setBtnNextDisabled = (currentPageHigh, totalPosts) => {
  document.querySelector('#btnNext').disabled =
    currentPageHigh < totalPosts ? false : true;
};

const configurePreviousAndNextButtons = () => {
  const oldPrevDisabled = document.querySelector('#btnPrevious').disabled;
  const oldNextDisabled = document.querySelector('#btnNext').disabled;

  const btnPrevious = document.querySelector('#btnPrevious');
  btnPrevious.disabled = false;

  const btnNext = document.querySelector('#btnNext');
  btnNext.disabled = false;

  if (btnPrevious.getAttribute('hasEventHandler'))
    removeEventHandler('btnPrevious');

  if (btnNext.getAttribute('hasEventHandler')) removeEventHandler('btnNext');

  document.querySelector('#btnPrevious').disabled = oldPrevDisabled;
  document.querySelector('#btnNext').disabled = oldNextDisabled;
};

const isBtnPreviousDisabled = () => {
  return document.querySelector('#btnPrevious').disabled;
};

const isBtnNextDisabled = () => {
  return document.querySelector('#btnNext').disabled;
};

const btnPreviousHasEventHandler = () => {
  return document.querySelector('#btnPrevious').getAttribute('hasEventHandler');
};

const btnNextHasEventHandler = () => {
  return document.querySelector('#btnNext').getAttribute('hasEventHandler');
};

const currentPageLowValue = (totalPosts, currentPageHigh) => {
  let currentPageLow = 0;

  if (totalPosts < 1) {
    currentPageLow = 0;
  } else {
    currentPageLow = totalPosts < 25 ? 1 : currentPageHigh - 24;
  }

  return currentPageLow;
};

const currentPageHighValue = (currentPageHigh, totalPosts) => {
  currentPageHigh =
    currentPageHigh <= totalPosts ? currentPageHigh : totalPosts;
  return currentPageHigh;
};

// TODO: rewrite how we are registering/removing these events. this approach is wrong and unnecessary
const removeEventHandler = (btnID) => {
  const oldBtn = document.querySelector(`#${btnID}`);
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);
  document.querySelector(`#${btnID}`).removeAttribute('hasEventHandler');
};

const btnPreviousOnClick = (
  folder,
  currentPageLow,
  currentPageHigh,
  currentTotalPosts
) => {
  currentPageHigh =
    currentPageHigh === currentTotalPosts
      ? currentPageLow - 1
      : currentPageHigh - 25;
  document
    .querySelector('#btnPrevious')
    .setAttribute('hasEventHandler', 'true'); // TODO: rewrite how we are registering/removing these events. this approach is wrong and unnecessary
  displayPostsFromFolder(folder, currentPageHigh);
};

const btnNextOnClick = (folder, currentPageHigh) => {
  currentPageHigh = currentPageHigh + 25;
  document.querySelector('#btnNext').setAttribute('hasEventHandler', 'true'); // TODO: rewrite how we are registering/removing these events. this approach is wrong and unnecessary
  displayPostsFromFolder(folder, currentPageHigh);
};

const displayPost = (savedPost) => {
  const post = generatePost(savedPost);
  const link = generateLinkForPost(savedPost);

  appendPostToPage(post);
  appendLinkToPost(post, link); // TODO: rewrite how you're adding the link to the post. it doesn't have to be in backwards order like this

  appendHorizontalRuleToPostsSection();
};

const generatePost = (savedPost) => {
  const post = document.createElement('div');
  post.className = 'post';
  post.id = savedPost.id;
  return post;
};

const generateLinkForPost = (savedPost) => {
  const link = document.createElement('a');
  link.href = savedPost.link;
  if (savedPost.id.substring(0, 3) === 't1_') {
    link.innerHTML = '(comment)';
  }
  link.innerHTML += savedPost.title;
  link.target = '_blank';
  return link;
};

const appendPostToPage = (savedPost) => {
  document.querySelector('#posts').appendChild(savedPost);
};

const appendLinkToPost = (post, link) => {
  document.querySelector(`#${post.id}`).appendChild(link);
};

const appendHorizontalRuleToPostsSection = () => {
  document.querySelector('#posts').innerHTML += '<hr>';
};

document.querySelector('#btnSync').addEventListener('click', handleSync);
