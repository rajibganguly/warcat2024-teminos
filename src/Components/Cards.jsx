import React from 'react'


const Cards = ({ data }) => {
    return (
        <div className="col-xl-3 col-md-6">
            <div className="card">
                <div className="card-body">
                    <div className="d-flex">
                        <div className="flex-grow-1">
                            <p className="text-truncate font-size-14 mb-2">{data.title}</p>
                            <h4 className="mb-2">{data.value}</h4>
                        </div>
                        <div className="avatar-sm">
                            <span className="avatar-title bg-light text-warning rounded-3">
                                <i className={data.iconClass}></i>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Cards