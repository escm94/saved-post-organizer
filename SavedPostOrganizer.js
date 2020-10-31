const postsPerRequest = 100;
const maxPostsToFetch = 1000;
const maxRequests = maxPostsToFetch / postsPerRequest;

let responses = [];
let folders = [];
let posts = [];
let lastSyncedDate;

//TODO: potentially temporary. currently need these for the btnPrevious and btnNext event listeners. if not temporary, remove all redundant local vars
let currentFolderName;
let currentPageLow;
let currentPageHigh;
let currentTotalPosts;

const handleSync = e => {        
    folders = [];
    posts = [];
    responses = [];

    currentFolderName = '';
    currentPageLow = 0;
    currentPageHigh = 0;
    currentTotalPosts = 0;

    const allFolder = {
        folderName: 'All',
        savedPosts: [],
        defaultFolder: true
    };
    folders.push(allFolder);
    
    fetchPosts();
}

window.onload = (event) => {
    folders = [];
    posts = [];
    
    if (localStorage.getItem('folders') != null) {
        folders = JSON.parse(localStorage.getItem('folders'));
    } 

    if (localStorage.getItem('posts') != null) {
        posts = JSON.parse(localStorage.getItem('posts'));
    }

    let pageHigh = (posts.length > 25) ? 25 : posts.length;

    folders.forEach(displayFolder);

    document.getElementById('btnPrevious').disabled = false;
    document.getElementById('btnNext').disabled = false;  
    document.getElementById('btnPrevious').setAttribute('hasEventHandler', 'false');
    document.getElementById('btnNext').setAttribute('hasEventHandler', 'false');
    document.getElementById('btnPrevious').disabled = true;
    document.getElementById('btnNext').disabled = true;  
    
    displayPostsFromFolder('All', pageHigh);
    document.getElementById('lastSyncedVal').innerHTML = localStorage.getItem('lastSynced');
};

const fetchPosts = async (afterParam) => {
    //TODO: obviously refine this
    try {
        document.getElementById('btnSync').classList.add("spin");

        const response = await fetch(`https://www.reddit.com/saved.json?limit=${postsPerRequest}${
            afterParam ? '&after=' + afterParam : ''
        }`); 
    
        const responseJSON = await response.json();
        responses.push(responseJSON);
        responseJSON.data.children.forEach(processPost);

        if (responseJSON.data.after && responses.length < maxRequests) {
            fetchPosts(responseJSON.data.after);
            return;
        }

        let tempDate = new Date(Date.now());
        lastSyncedDate = tempDate.toString().split(" GMT")[0];
        localStorage.setItem('lastSynced', lastSyncedDate);
        posts.forEach(post => folders.find(folder => folder.folderName === 'All').savedPosts.push(post));
        localStorage.setItem('folders', JSON.stringify(folders));
        localStorage.setItem('posts', JSON.stringify(posts));
        displayAll();
        
        document.getElementById('btnSync').classList.remove("spin");
    } catch (error) {
        document.getElementById('btnSync').classList.remove("spin");
        document.getElementById('lblLastSynced').classList.add('hide');
        document.getElementById('lastSyncedVal').classList.add('hide');
        document.getElementById('lblLogin').classList.remove('hide');
        document.getElementById('lblLogin').classList.add('show');
    }
};

function processPost(savedItem) {
    if (folders.find(folder => folder.folderName === savedItem.data.subreddit_name_prefixed) == null) {
        const newFolder = {
            folderName: savedItem.data.subreddit_name_prefixed,
            savedPosts: [],
            defaultFolder: true
        };
        folders.push(newFolder);
    }

    const savedPost = {
        id: savedItem.data.name
    };

    //post is a comment and not a post, so url won't work
    if (savedItem.data.name.substring(0, 3) === 't1_') {
        savedPost.link = 'https://reddit.com' + savedItem.data.permalink;
        savedPost.title = savedItem.data.link_title;
    }
    else {
        savedPost.link = savedItem.data.url;
        savedPost.title = savedItem.data.title;
    }

    folders.find(folder => folder.folderName === savedItem.data.subreddit_name_prefixed).savedPosts.push(savedPost);

    if (posts.find(post => post.id === savedPost.id) == null) {
        const newPost = {
            id: savedPost.id,
            title: savedPost.title,
            link: savedPost.link
        };
        posts.push(newPost);
    }
}

//TODO: rename
const displayAll = () => {
    let pageHigh = (posts.length > 25) ? 25 : posts.length;
    document.getElementById('lastSyncedVal').innerHTML = localStorage.getItem('lastSynced');
    document.getElementById('folders').innerHTML = '';
    folders.forEach(displayFolder);
    displayPostsFromFolder('All', pageHigh);
};

function displayFolder(folder) {
    const btnFolder = document.createElement('div');
    const numPosts = folders.find(flder => flder.folderName === folder.folderName).savedPosts.length;
    const pageHigh = (numPosts < 25) ? numPosts : 25;

    btnFolder.className = 'folder';
    btnFolder.id = folder.folderName;

    if (folder.folderName === 'All') {
        btnFolder.innerHTML = "<strong>" + folder.folderName + '(' + folder.savedPosts.length + ')' + "</strong>";
    }
    else {
        btnFolder.innerHTML = folder.folderName + "(" + folder.savedPosts.length + ")";
    }
    btnFolder.addEventListener('click', function(){        
        currentPageLow = 1;

        document.getElementById('btnPrevious').disabled = false;
        document.getElementById('btnNext').disabled = false;

        if (document.getElementById('btnPrevious').getAttribute('hasEventHandler') === 'true') {
            document.getElementById('btnPrevious').removeEventListener('click', btnPreviousOnClick);
            document.getElementById('btnPrevious').setAttribute('hasEventHandler', 'false');
        }
        if (document.getElementById('btnNext').getAttribute('hasEventHandler') === 'true') {
            document.getElementById('btnNext').removeEventListener('click', btnNextOnClick);
            document.getElementById('btnNext').setAttribute('hasEventHandler', 'false');
        }

        document.getElementById('btnPrevious').disabled = true;
        document.getElementById('btnNext').disabled = true;
        
        displayPostsFromFolder(btnFolder.id, pageHigh);
    });
    document.getElementById('folders').appendChild(btnFolder);    
}

//TODO: remove redundant local/global var logic, probably...eventually
function displayPostsFromFolder(folderName, pageHigh){
    let totalPosts = folders.find(folder => folder.folderName === folderName).savedPosts.length;
    let pageLow;
    pageHigh = (pageHigh <= totalPosts) ? pageHigh : totalPosts;

    //TODO: yeah we gotta clean this up - move somewhere else, something
    if (totalPosts < 1) {
        pageLow = 0;
    }   
    else if (totalPosts < 25 || currentPageLow < 1) {
        pageLow = 1;
    } 
    else {
       pageLow = (currentPageLow == undefined) ? 1 : currentPageLow; 
    }
        
    let lblFolderName = document.getElementById('lblFolderName');
    lblFolderName.innerHTML = folderName;
    lblFolderName.className = 'show';
    document.getElementById('lblPages').innerHTML = pageLow + '-' + pageHigh + ' of ' + totalPosts;

    document.getElementById('posts').innerHTML = '';
    
    let postsOnPage = folders.find(folder => folder.folderName === folderName).savedPosts.slice(pageLow - 1, pageHigh);
    postsOnPage.forEach(displayPost);
    
    document.getElementById('btnPrevious').disabled = (pageLow > 1) ? false : true;
    document.getElementById('btnNext').disabled = (pageHigh < totalPosts) ? false : true;

    if (document.getElementById('btnPrevious').getAttribute('hasEventHandler') === 'true') {
        document.getElementById('btnPrevious').removeEventListener('click', btnPreviousOnClick);
        document.getElementById('btnPrevious').setAttribute('hasEventHandler', 'false');
    }
    if (document.getElementById('btnNext').getAttribute('hasEventHandler') === 'true') {
        document.getElementById('btnNext').removeEventListener('click', btnNextOnClick);
        document.getElementById('btnNext').setAttribute('hasEventHandler', 'false');
    }
    
    currentFolderName = folderName;
    currentPageLow = pageLow;
    currentPageHigh = pageHigh;
    currentTotalPosts = totalPosts;

    if (document.getElementById('btnPrevious').disabled == false && document.getElementById('btnPrevious').getAttribute('hasEventHandler') == 'false') {
        document.getElementById('btnPrevious').addEventListener('click', btnPreviousOnClick);
    }
    if (document.getElementById('btnNext').disabled == false && document.getElementById('btnNext').getAttribute('hasEventHandler') == 'false') {
        document.getElementById('btnNext').addEventListener('click', btnNextOnClick);
    } 
}

//TODO: clean this up so we don't have to ugly up displayPostsFromFolder
const btnPreviousOnClick = () => {
    currentPageHigh = (currentPageHigh == currentTotalPosts) ? currentPageLow - 1 : currentPageHigh - 25;
    currentPageLow = currentPageLow - 25;
    document.getElementById('btnPrevious').setAttribute('hasEventHandler', 'true');
    displayPostsFromFolder(currentFolderName, currentPageHigh);
};

const btnNextOnClick = () => {
    currentPageLow = currentPageHigh + 1;
    currentPageHigh = currentPageHigh + 25;
    document.getElementById('btnNext').setAttribute('hasEventHandler', 'true');
    displayPostsFromFolder(currentFolderName, currentPageHigh);
};

function displayPost(savedPost){
    const post = document.createElement('div');
    post.className = 'post';
    post.id = savedPost.id;
    document.getElementById('posts').appendChild(post);
    
    const link = document.createElement('a');
    link.href = savedPost.link;

    if (savedPost.id.substring(0, 3) === 't1_') {
        link.innerHTML = '(comment)';
    }    

    link.innerHTML += savedPost.title;
    link.target = '_blank';
    document.getElementById(post.id).appendChild(link);

    document.getElementById('posts').innerHTML += '<hr>';
}

document.getElementById('btnSync').addEventListener('click', handleSync);
